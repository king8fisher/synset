import { Database } from "bun:sqlite";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import { readFileSync, unlinkSync } from "node:fs";
import { type ExportProgress, exportToSQLite, SCHEMA } from "./export-sqlite";
import { ensureWordNetCached } from "./loader";
import type { Lexicon } from "./types";

setDefaultTimeout(120000);

const TEST_DB_PATH = "./test-export.db";

let lexicon: Lexicon;

beforeAll(async () => {
  const result = await ensureWordNetCached({
    cacheDir: "./data",
    onProgress: console.log,
  });

  const { loadWordNet } = await import("./loader");
  lexicon = await loadWordNet(result.filePath);
});

afterAll(() => {
  try {
    unlinkSync(TEST_DB_PATH);
  } catch {
    // ignore if file doesn't exist
  }
});

describe("exportToSQLite", () => {
  test("creates database with correct schema", () => {
    exportToSQLite(lexicon, TEST_DB_PATH);

    const db = new Database(TEST_DB_PATH, { readonly: true });

    // Check tables exist
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("words");
    expect(tableNames).toContain("synsets");
    expect(tableNames).toContain("word_synsets");

    db.close();
  });

  test("words table has expected columns and data", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });

    const row = db
      .query("SELECT id, word, word_display FROM words LIMIT 1")
      .get() as { id: number; word: string; word_display: string };

    expect(row.id).toBeDefined();
    expect(typeof row.word).toBe("string");
    expect(typeof row.word_display).toBe("string");

    const count = db.query("SELECT COUNT(*) as c FROM words").get() as {
      c: number;
    };
    expect(count.c).toBeGreaterThan(100000);

    db.close();
  });

  test("synsets table has expected columns and data", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });

    const row = db
      .query("SELECT id, pos, definition FROM synsets LIMIT 1")
      .get() as { id: string; pos: string; definition: string };

    expect(row.id).toBeDefined();
    expect(typeof row.pos).toBe("string");
    expect(typeof row.definition).toBe("string");

    const count = db.query("SELECT COUNT(*) as c FROM synsets").get() as {
      c: number;
    };
    expect(count.c).toBeGreaterThan(100000);

    db.close();
  });

  test("word_synsets junction table links words to synsets", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });

    const count = db.query("SELECT COUNT(*) as c FROM word_synsets").get() as {
      c: number;
    };
    expect(count.c).toBeGreaterThan(150000);

    // Verify join works
    const joined = db
      .query(`
        SELECT w.word, s.definition
        FROM words w
        JOIN word_synsets ws ON w.id = ws.word_id
        JOIN synsets s ON ws.synset_id = s.id
        WHERE w.word = 'dog'
        LIMIT 1
      `)
      .get() as { word: string; definition: string };

    expect(joined.word).toBe("dog");
    expect(joined.definition.length).toBeGreaterThan(0);

    db.close();
  });

  test("onProgress callback is called", () => {
    const progressEvents: ExportProgress[] = [];
    const tempPath = "./test-progress.db";

    try {
      exportToSQLite(lexicon, tempPath, {
        onProgress: (p) => progressEvents.push({ ...p }),
      });

      // Should have progress events for all phases
      const phases = new Set(progressEvents.map((p) => p.phase));
      expect(phases.has("words")).toBe(true);
      expect(phases.has("synsets")).toBe(true);
      expect(phases.has("word_synsets")).toBe(true);
      expect(phases.has("synset_relations")).toBe(true);
      expect(phases.has("sense_relations")).toBe(true);

      // Each event should have current and total
      for (const event of progressEvents) {
        expect(typeof event.current).toBe("number");
        expect(typeof event.total).toBe("number");
        expect(event.current).toBeLessThanOrEqual(event.total);
      }
    } finally {
      try {
        unlinkSync(tempPath);
      } catch {
        // ignore
      }
    }
  });

  test("word lookup is case-insensitive via lowercase storage", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });

    const row = db
      .query("SELECT word, word_display FROM words WHERE word = 'dog'")
      .get() as { word: string; word_display: string };

    expect(row.word).toBe("dog"); // lowercase
    expect(row.word_display).toBe("dog"); // original casing preserved

    db.close();
  });
});

describe("SCHEMA", () => {
  test("inline SCHEMA matches schema.sql file", () => {
    const fileContent = readFileSync("src/schema.sql", "utf-8");

    // Normalize: remove comments and extra whitespace
    const normalize = (s: string) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim();

    expect(normalize(SCHEMA)).toBe(normalize(fileContent));
  });
});
