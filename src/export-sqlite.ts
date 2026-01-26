import { Database } from "bun:sqlite";
import { decodeXmlEntities } from "./helpers";
import type { LexicalEntry, Lexicon, Synset } from "./types";

/**
 * SQLite schema for WordNet export.
 * Also available as dist/schema.sql in the package.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY,
  word TEXT NOT NULL,
  word_display TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);

CREATE TABLE IF NOT EXISTS synsets (
  id TEXT PRIMARY KEY,
  pos TEXT NOT NULL,
  definition TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS word_synsets (
  word_id INTEGER NOT NULL,
  synset_id TEXT NOT NULL,
  PRIMARY KEY (word_id, synset_id)
);
CREATE INDEX IF NOT EXISTS idx_ws_word ON word_synsets(word_id);
`;

export interface ExportProgress {
  phase: "words" | "synsets" | "relations";
  current: number;
  total: number;
}

export interface ExportOptions {
  onProgress?: (progress: ExportProgress) => void;
}

/**
 * Export WordNet lexicon to SQLite database.
 * Creates a compact database optimized for word lookup and definition retrieval.
 */
export function exportToSQLite(
  lexicon: Lexicon,
  outputPath: string,
  options: ExportOptions = {},
): void {
  const { onProgress } = options;

  // Create database
  const db = new Database(outputPath, { create: true });
  db.exec("PRAGMA journal_mode = OFF");
  db.exec("PRAGMA synchronous = OFF");
  db.exec(SCHEMA);

  // Build word -> entries mapping and collect unique words
  const wordToEntries = new Map<string, LexicalEntry[]>();
  for (const entry of lexicon.lexicalEntries) {
    const word = entry.lemmas[0]?.writtenForm;
    if (word) {
      const lower = word.toLowerCase();
      const existing = wordToEntries.get(lower) || [];
      existing.push(entry);
      wordToEntries.set(lower, existing);
    }
  }

  // Build synset lookup
  const synsetMap = new Map<string, Synset>();
  for (const synset of lexicon.synsets) {
    synsetMap.set(synset.id, synset);
  }

  // Insert words
  const insertWord = db.prepare(
    "INSERT INTO words (word, word_display) VALUES (?, ?)",
  );
  const wordIds = new Map<string, number>();
  const words = Array.from(wordToEntries.keys()).sort();
  const totalWords = words.length;

  db.exec("BEGIN TRANSACTION");
  let wordId = 0;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const entries = wordToEntries.get(word);
    if (!entries) continue;
    // Use first entry's original casing as display form
    const display = entries[0].lemmas[0]?.writtenForm || word;
    insertWord.run(word, display);
    wordId++;
    wordIds.set(word, wordId);
    if (onProgress && i % 10000 === 0) {
      onProgress({ phase: "words", current: i, total: totalWords });
    }
  }
  db.exec("COMMIT");

  // Insert synsets (only those that have word associations)
  const usedSynsetIds = new Set<string>();
  for (const entries of wordToEntries.values()) {
    for (const entry of entries) {
      for (const sense of entry.senses) {
        usedSynsetIds.add(sense.synset);
      }
    }
  }

  const insertSynset = db.prepare(
    "INSERT OR IGNORE INTO synsets (id, pos, definition) VALUES (?, ?, ?)",
  );
  const synsetList = Array.from(usedSynsetIds);
  const totalSynsets = synsetList.length;

  db.exec("BEGIN TRANSACTION");
  for (let i = 0; i < synsetList.length; i++) {
    const synsetId = synsetList[i];
    const synset = synsetMap.get(synsetId);
    if (synset) {
      const def = decodeXmlEntities(synset.definitions[0]?.inner) || "";
      insertSynset.run(synsetId, synset.partOfSpeech, def);
    }
    if (onProgress && i % 10000 === 0) {
      onProgress({ phase: "synsets", current: i, total: totalSynsets });
    }
  }
  db.exec("COMMIT");

  // Insert word-synset relations
  const insertRelation = db.prepare(
    "INSERT OR IGNORE INTO word_synsets (word_id, synset_id) VALUES (?, ?)",
  );
  let relationCount = 0;
  const totalRelations = Array.from(wordToEntries.values()).reduce(
    (sum, entries) => sum + entries.reduce((s, e) => s + e.senses.length, 0),
    0,
  );

  db.exec("BEGIN TRANSACTION");
  for (const [word, entries] of wordToEntries) {
    const wordId = wordIds.get(word);
    if (!wordId) continue;

    for (const entry of entries) {
      for (const sense of entry.senses) {
        insertRelation.run(wordId, sense.synset);
        relationCount++;
        if (onProgress && relationCount % 10000 === 0) {
          onProgress({
            phase: "relations",
            current: relationCount,
            total: totalRelations,
          });
        }
      }
    }
  }
  db.exec("COMMIT");

  db.close();
}
