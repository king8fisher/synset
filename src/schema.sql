-- WordNet SQLite Schema
-- Used by: bunx synset export-sqlite <output.db>

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