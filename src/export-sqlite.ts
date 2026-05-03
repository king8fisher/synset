import { existsSync, unlinkSync } from "node:fs";
import Database from "libsql";
import { decodeXmlEntities } from "./helpers";
import type { LexicalEntry, Lexicon, Synset } from "./types";

/**
 * SQLite schema for WordNet export.
 * Also available as dist/schema.sql in the package.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY,
  word TEXT NOT NULL,          -- lowercase for search
  word_display TEXT NOT NULL   -- original casing
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
  sense_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (word_id, synset_id)
);
CREATE INDEX IF NOT EXISTS idx_ws_word ON word_synsets(word_id);
CREATE INDEX IF NOT EXISTS idx_ws_order ON word_synsets(word_id, sense_order);

CREATE TABLE IF NOT EXISTS synset_relations (
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  rel_type TEXT NOT NULL,
  PRIMARY KEY (source_id, target_id, rel_type)
);
CREATE INDEX IF NOT EXISTS idx_sr_source ON synset_relations(source_id);
CREATE INDEX IF NOT EXISTS idx_sr_target ON synset_relations(target_id);

CREATE TABLE IF NOT EXISTS sense_relations (
  source_word_id INTEGER NOT NULL,
  source_synset_id TEXT NOT NULL,
  target_word_id INTEGER NOT NULL,
  target_synset_id TEXT NOT NULL,
  rel_type TEXT NOT NULL,
  PRIMARY KEY (source_word_id, source_synset_id, target_word_id, target_synset_id, rel_type)
);
CREATE INDEX IF NOT EXISTS idx_sense_rel_source ON sense_relations(source_word_id, source_synset_id);

CREATE TABLE IF NOT EXISTS synset_examples (
  synset_id TEXT NOT NULL,
  example TEXT NOT NULL,
  example_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (synset_id, example_order)
);
CREATE INDEX IF NOT EXISTS idx_examples_synset ON synset_examples(synset_id);

CREATE TABLE IF NOT EXISTS word_regions (
  word_id INTEGER NOT NULL,
  region  TEXT NOT NULL,
  PRIMARY KEY (word_id, region)
);
CREATE INDEX IF NOT EXISTS idx_word_regions_region ON word_regions(region);
`;

export interface ExportProgress {
  phase:
    | "words"
    | "synsets"
    | "word_synsets"
    | "synset_examples"
    | "synset_relations"
    | "sense_relations"
    | "word_regions";
  current: number;
  total: number;
}

/**
 * Synsets used by WordNet to mark regional/dialect spelling. Each entry maps
 * a region tag to the synset whose `exemplifies` sense relation classifies a
 * lemma as belonging to that region. Exported so tests can assert it stays
 * comprehensive across WordNet releases.
 */
export const REGION_EXEMPLIFIES: ReadonlyArray<
  readonly [region: string, synsetId: string]
> = [
  ["us", "oewn-87027384-n"], // US spelling
  ["us", "oewn-06960241-n"], // US dialect
  ["gb", "oewn-86712636-n"], // UK spelling
  ["gb", "oewn-82423757-n"], // UK dialect
  ["au", "oewn-84746436-n"], // AU spelling
  ["ca", "oewn-80475027-n"], // CA spelling
  ["ca", "oewn-81058259-n"], // CA dialect
  ["scotland", "oewn-06962971-n"], // Scotland dialect
];

export const ALL_TABLES = [
  "words",
  "synsets",
  "word_synsets",
  "synset_relations",
  "sense_relations",
  "synset_examples",
  "word_regions",
] as const;
export type ExportTable = (typeof ALL_TABLES)[number];

const TABLE_DEPS: Record<ExportTable, readonly ExportTable[]> = {
  words: [],
  synsets: ["words"],
  word_synsets: ["words", "synsets"],
  synset_relations: ["synsets"],
  sense_relations: ["words", "synsets"],
  synset_examples: ["synsets"],
  word_regions: ["words", "sense_relations"],
};

export interface ExportOptions {
  onProgress?: (progress: ExportProgress) => void;
  /** If true, delete existing file before export. If false (default), error if file exists. */
  overwrite?: boolean;
  /**
   * Subset of tables to populate. When omitted, all tables are exported.
   * The schema (CREATE TABLE statements) is always run for every table; only
   * row insertion is gated. Validates that requested tables exist and that
   * each requested table's dependencies are also requested.
   */
  tables?: readonly ExportTable[];
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
  const { onProgress, overwrite, tables } = options;

  // Validate `tables` and resolve the active set (default: all tables).
  const selected = new Set<ExportTable>(tables ?? ALL_TABLES);
  if (tables) {
    const unknown = tables.filter(
      (t) => !(ALL_TABLES as readonly string[]).includes(t),
    );
    if (unknown.length > 0) {
      throw new Error(
        `Unknown table(s): ${unknown.join(", ")}. Valid: ${ALL_TABLES.join(", ")}`,
      );
    }
    for (const t of tables) {
      const missing = TABLE_DEPS[t].filter((dep) => !selected.has(dep));
      if (missing.length > 0) {
        throw new Error(
          `Table '${t}' requires: ${missing.join(", ")}. Add them to --tables or omit --tables for full export.`,
        );
      }
    }
  }

  // Check if file exists
  if (existsSync(outputPath)) {
    if (overwrite) {
      unlinkSync(outputPath);
    } else {
      throw new Error(
        `File already exists: ${outputPath}. Use --overwrite to replace it.`,
      );
    }
  }

  // Create database
  const db = new Database(outputPath);
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
  const wordIds = new Map<string, number>();
  if (selected.has("words")) {
    const insertWord = db.prepare(
      "INSERT INTO words (word, word_display) VALUES (?, ?)",
    );
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
  }

  // Collect synsets that have word associations (used by several phases below).
  const usedSynsetIds = new Set<string>();
  for (const entries of wordToEntries.values()) {
    for (const entry of entries) {
      for (const sense of entry.senses) {
        usedSynsetIds.add(sense.synset);
      }
    }
  }

  // Insert synsets
  if (selected.has("synsets")) {
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
  }

  // Insert word-synset relations with sense ordering
  if (selected.has("word_synsets")) {
    const insertWordSynset = db.prepare(
      "INSERT OR IGNORE INTO word_synsets (word_id, synset_id, sense_order) VALUES (?, ?, ?)",
    );
    let wsCount = 0;
    const totalWordSynsets = Array.from(wordToEntries.values()).reduce(
      (sum, entries) => sum + entries.reduce((s, e) => s + e.senses.length, 0),
      0,
    );

    db.exec("BEGIN TRANSACTION");
    for (const [word, entries] of wordToEntries) {
      const wId = wordIds.get(word);
      if (!wId) continue;

      // Track sense order per word (across all entries for this word)
      let senseOrder = 0;
      for (const entry of entries) {
        for (const sense of entry.senses) {
          insertWordSynset.run(wId, sense.synset, senseOrder);
          senseOrder++;
          wsCount++;
          if (onProgress && wsCount % 10000 === 0) {
            onProgress({
              phase: "word_synsets",
              current: wsCount,
              total: totalWordSynsets,
            });
          }
        }
      }
    }
    db.exec("COMMIT");
  }

  // Insert synset examples
  if (selected.has("synset_examples")) {
    const insertExample = db.prepare(
      "INSERT OR IGNORE INTO synset_examples (synset_id, example, example_order) VALUES (?, ?, ?)",
    );

    // Count total examples
    let totalExamples = 0;
    for (const synsetId of usedSynsetIds) {
      const synset = synsetMap.get(synsetId);
      if (synset?.examples) {
        totalExamples += synset.examples.length;
      }
    }

    db.exec("BEGIN TRANSACTION");
    let exCount = 0;
    for (const synsetId of usedSynsetIds) {
      const synset = synsetMap.get(synsetId);
      if (!synset?.examples) continue;

      for (let i = 0; i < synset.examples.length; i++) {
        const example = decodeXmlEntities(synset.examples[i].inner);
        if (example) {
          insertExample.run(synsetId, example, i);
          exCount++;
          if (onProgress && exCount % 10000 === 0) {
            onProgress({
              phase: "synset_examples",
              current: exCount,
              total: totalExamples,
            });
          }
        }
      }
    }
    db.exec("COMMIT");
  }

  // Insert synset relations (only for synsets we've exported)
  if (selected.has("synset_relations")) {
    const insertSynsetRelation = db.prepare(
      "INSERT OR IGNORE INTO synset_relations (source_id, target_id, rel_type) VALUES (?, ?, ?)",
    );

    // Count total relations for progress
    let totalSynsetRelations = 0;
    for (const synsetId of usedSynsetIds) {
      const synset = synsetMap.get(synsetId);
      if (synset) {
        for (const rel of synset.synsetRelations) {
          if (usedSynsetIds.has(rel.target)) {
            totalSynsetRelations++;
          }
        }
      }
    }

    db.exec("BEGIN TRANSACTION");
    let srCount = 0;
    for (const synsetId of usedSynsetIds) {
      const synset = synsetMap.get(synsetId);
      if (!synset) continue;

      for (const rel of synset.synsetRelations) {
        // Only include relations to synsets we've exported
        if (usedSynsetIds.has(rel.target)) {
          insertSynsetRelation.run(synsetId, rel.target, rel.relType);
          srCount++;
          if (onProgress && srCount % 10000 === 0) {
            onProgress({
              phase: "synset_relations",
              current: srCount,
              total: totalSynsetRelations,
            });
          }
        }
      }
    }
    db.exec("COMMIT");
  }

  // Build sense_id -> (word_id, synset_id) mapping (needed by sense_relations
  // and word_regions phases).
  const senseToWordSynset = new Map<
    string,
    { wordId: number; synsetId: string }
  >();
  for (const [word, entries] of wordToEntries) {
    const wId = wordIds.get(word);
    if (!wId) continue;
    for (const entry of entries) {
      for (const sense of entry.senses) {
        senseToWordSynset.set(sense.id, {
          wordId: wId,
          synsetId: sense.synset,
        });
      }
    }
  }

  // Insert sense relations
  if (selected.has("sense_relations")) {
    const insertSenseRelation = db.prepare(
      "INSERT OR IGNORE INTO sense_relations (source_word_id, source_synset_id, target_word_id, target_synset_id, rel_type) VALUES (?, ?, ?, ?, ?)",
    );

    // Count and collect valid sense relations
    let totalSenseRelations = 0;
    for (const entries of wordToEntries.values()) {
      for (const entry of entries) {
        for (const sense of entry.senses) {
          for (const rel of sense.senseRelations) {
            if (senseToWordSynset.has(rel.target)) {
              totalSenseRelations++;
            }
          }
        }
      }
    }

    db.exec("BEGIN TRANSACTION");
    let senseRelCount = 0;
    for (const [word, entries] of wordToEntries) {
      const sourceWordId = wordIds.get(word);
      if (!sourceWordId) continue;

      for (const entry of entries) {
        for (const sense of entry.senses) {
          const sourceSynsetId = sense.synset;

          for (const rel of sense.senseRelations) {
            const target = senseToWordSynset.get(rel.target);
            if (target) {
              insertSenseRelation.run(
                sourceWordId,
                sourceSynsetId,
                target.wordId,
                target.synsetId,
                rel.relType,
              );
              senseRelCount++;
              if (onProgress && senseRelCount % 10000 === 0) {
                onProgress({
                  phase: "sense_relations",
                  current: senseRelCount,
                  total: totalSenseRelations,
                });
              }
            }
          }
        }
      }
    }
    db.exec("COMMIT");
  }

  // Insert word regions (derived from "exemplifies" sense relations whose
  // target sense belongs to one of the regional category synsets above).
  if (selected.has("word_regions")) {
    const insertWordRegion = db.prepare(
      "INSERT OR IGNORE INTO word_regions (word_id, region) VALUES (?, ?)",
    );

    const regionBySynset = new Map<string, string>(
      REGION_EXEMPLIFIES.map(([region, synsetId]) => [synsetId, region]),
    );

    let totalRegions = 0;
    for (const entries of wordToEntries.values()) {
      for (const entry of entries) {
        for (const sense of entry.senses) {
          for (const rel of sense.senseRelations) {
            if (rel.relType !== "exemplifies") continue;
            const target = senseToWordSynset.get(rel.target);
            if (target && regionBySynset.has(target.synsetId)) {
              totalRegions++;
            }
          }
        }
      }
    }

    if (onProgress) {
      onProgress({ phase: "word_regions", current: 0, total: totalRegions });
    }

    db.exec("BEGIN TRANSACTION");
    let regionCount = 0;
    for (const [word, entries] of wordToEntries) {
      const wId = wordIds.get(word);
      if (!wId) continue;
      for (const entry of entries) {
        for (const sense of entry.senses) {
          for (const rel of sense.senseRelations) {
            if (rel.relType !== "exemplifies") continue;
            const target = senseToWordSynset.get(rel.target);
            if (!target) continue;
            const region = regionBySynset.get(target.synsetId);
            if (!region) continue;
            insertWordRegion.run(wId, region);
            regionCount++;
            if (onProgress && regionCount % 500 === 0) {
              onProgress({
                phase: "word_regions",
                current: regionCount,
                total: totalRegions,
              });
            }
          }
        }
      }
    }
    db.exec("COMMIT");

    if (onProgress) {
      onProgress({
        phase: "word_regions",
        current: regionCount,
        total: totalRegions,
      });
    }
  }

  db.close();
}
