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
  PRIMARY KEY (word_id, synset_id)
);
CREATE INDEX IF NOT EXISTS idx_ws_word ON word_synsets(word_id);
