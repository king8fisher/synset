import type { z } from "zod";
import type {
  LexicalEntry,
  Lexicon,
  Sense,
  Synset,
  SynsetRelation,
  SynsetRelationRelType as SynsetRelationRelTypeSchema,
} from "./types";

export type SynsetRelationRelType = z.infer<typeof SynsetRelationRelTypeSchema>;

/** Definition with its source synset */
export interface DefinitionResult {
  text: string;
  synset: Synset;
  partOfSpeech: string;
}

/** Synonym with its source context */
export interface SynonymResult {
  word: string;
  entry: LexicalEntry;
  synset: Synset;
}

/** Indexed WordNet data for fast lookups */
export interface WordNetIndex {
  /** All synsets indexed by ID */
  synsets: Map<string, Synset>;
  /** All senses indexed by ID */
  senses: Map<string, Sense>;
  /** All lexical entries indexed by ID */
  entries: Map<string, LexicalEntry>;
  /** Lexical entries indexed by word (lowercase) */
  byWord: Map<string, LexicalEntry[]>;
  /** Senses indexed by word (lowercase) */
  sensesByWord: Map<string, Sense[]>;
  /** Synsets indexed by word (lowercase) */
  synsetsByWord: Map<string, Synset[]>;
  /** Original lexicon */
  lexicon: Lexicon;
}

/**
 * Build an indexed structure for fast lookups.
 * Call this once after loading the lexicon.
 */
export function buildIndex(lexicon: Lexicon): WordNetIndex {
  const synsets = new Map<string, Synset>();
  const senses = new Map<string, Sense>();
  const entries = new Map<string, LexicalEntry>();
  const byWord = new Map<string, LexicalEntry[]>();
  const sensesByWord = new Map<string, Sense[]>();
  const synsetsByWord = new Map<string, Synset[]>();

  // Index synsets
  for (const synset of lexicon.synsets) {
    synsets.set(synset.id, synset);
  }

  // Index lexical entries and senses
  for (const entry of lexicon.lexicalEntries) {
    entries.set(entry.id, entry);

    const word = entry.lemmas[0]?.writtenForm.toLowerCase();
    if (word) {
      // Index by word
      const existing = byWord.get(word) || [];
      existing.push(entry);
      byWord.set(word, existing);

      // Index senses by word
      for (const sense of entry.senses) {
        senses.set(sense.id, sense);

        const existingSenses = sensesByWord.get(word) || [];
        existingSenses.push(sense);
        sensesByWord.set(word, existingSenses);

        // Index synsets by word
        const synset = synsets.get(sense.synset);
        if (synset) {
          const existingSynsets = synsetsByWord.get(word) || [];
          if (!existingSynsets.includes(synset)) {
            existingSynsets.push(synset);
            synsetsByWord.set(word, existingSynsets);
          }
        }
      }
    }
  }

  return {
    synsets,
    senses,
    entries,
    byWord,
    sensesByWord,
    synsetsByWord,
    lexicon,
  };
}

/** Get a synset by ID */
export function getSynset(index: WordNetIndex, id: string): Synset | undefined {
  return index.synsets.get(id);
}

/** Get a sense by ID */
export function getSense(index: WordNetIndex, id: string): Sense | undefined {
  return index.senses.get(id);
}

/** Get a lexical entry by ID */
export function getLexicalEntry(
  index: WordNetIndex,
  id: string,
): LexicalEntry | undefined {
  return index.entries.get(id);
}

/** Find all lexical entries for a word */
export function findWord(index: WordNetIndex, word: string): LexicalEntry[] {
  return index.byWord.get(word.toLowerCase()) || [];
}

/** Find all senses for a word */
export function findSenses(index: WordNetIndex, word: string): Sense[] {
  return index.sensesByWord.get(word.toLowerCase()) || [];
}

/** Find all synsets for a word */
export function findSynsets(index: WordNetIndex, word: string): Synset[] {
  return index.synsetsByWord.get(word.toLowerCase()) || [];
}

/** Get all definitions for a word */
export function getDefinitions(
  index: WordNetIndex,
  word: string,
): DefinitionResult[] {
  const synsets = findSynsets(index, word);
  return synsets.flatMap((synset) =>
    synset.definitions.map((d) => ({
      text: d.inner,
      synset,
      partOfSpeech: synset.partOfSpeech,
    })),
  );
}

/** Get related synsets by relation type */
export function getRelated(
  index: WordNetIndex,
  synset: Synset,
  relType: SynsetRelationRelType,
): Synset[] {
  return synset.synsetRelations
    .filter((r: SynsetRelation) => r.relType === relType)
    .map((r: SynsetRelation) => index.synsets.get(r.target))
    .filter((s): s is Synset => s !== undefined);
}

/** Get hypernyms (more general terms) for a word */
export function getHypernyms(index: WordNetIndex, word: string): Synset[] {
  const synsets = findSynsets(index, word);
  return synsets.flatMap((s) => getRelated(index, s, "hypernym"));
}

/** Get hyponyms (more specific terms) for a word */
export function getHyponyms(index: WordNetIndex, word: string): Synset[] {
  const synsets = findSynsets(index, word);
  return synsets.flatMap((s) => getRelated(index, s, "hyponym"));
}

/** Get synonyms for a word (words in the same synsets) */
export function getSynonyms(
  index: WordNetIndex,
  word: string,
): SynonymResult[] {
  const synsets = findSynsets(index, word);
  const lowerWord = word.toLowerCase();
  const seen = new Set<string>();
  const results: SynonymResult[] = [];

  for (const synset of synsets) {
    for (const memberId of synset.members) {
      const entry = index.entries.get(memberId);
      if (entry) {
        const lemma = entry.lemmas[0]?.writtenForm;
        if (lemma && lemma.toLowerCase() !== lowerWord && !seen.has(lemma)) {
          seen.add(lemma);
          results.push({ word: lemma, entry, synset });
        }
      }
    }
  }

  return results;
}

/** Get the written form of the first lemma for a synset */
export function getSynsetWords(index: WordNetIndex, synset: Synset): string[] {
  return synset.members
    .map((id) => index.entries.get(id))
    .filter((e): e is LexicalEntry => e !== undefined)
    .map((e) => e.lemmas[0]?.writtenForm)
    .filter((w): w is string => w !== undefined);
}
