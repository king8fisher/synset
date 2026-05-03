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
import {
  type ExportProgress,
  exportToSQLite,
  REGION_EXEMPLIFIES,
  SCHEMA,
} from "./export-sqlite";
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

describe("word_regions table", () => {
  test("has expected columns and primary key", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });

    const cols = db.query("PRAGMA table_info(word_regions)").all() as {
      name: string;
      type: string;
      notnull: number;
      pk: number;
    }[];

    const byName = new Map(cols.map((c) => [c.name, c]));
    expect(byName.get("word_id")?.type).toBe("INTEGER");
    expect(byName.get("word_id")?.notnull).toBe(1);
    expect(byName.get("region")?.type).toBe("TEXT");
    expect(byName.get("region")?.notnull).toBe(1);

    // Composite primary key (word_id, region)
    const pkCols = cols
      .filter((c) => c.pk > 0)
      .sort((a, b) => a.pk - b.pk)
      .map((c) => c.name);
    expect(pkCols).toEqual(["word_id", "region"]);

    db.close();
  });
});

describe("word_regions content", () => {
  function regionsFor(db: Database, word: string): Set<string> {
    const rows = db
      .query(
        `SELECT region FROM word_regions wr
         JOIN words w ON w.id = wr.word_id
         WHERE w.word = ?`,
      )
      .all(word) as { region: string }[];
    return new Set(rows.map((r) => r.region));
  }

  test("populated with at least 3500 rows", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });
    const { c } = db.query("SELECT COUNT(*) as c FROM word_regions").get() as {
      c: number;
    };
    expect(c).toBeGreaterThanOrEqual(3500);
    db.close();
  });

  test("at least 2200 distinct word_id values", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });
    const { c } = db
      .query("SELECT COUNT(DISTINCT word_id) as c FROM word_regions")
      .get() as { c: number };
    expect(c).toBeGreaterThanOrEqual(2200);
    db.close();
  });

  test("color is tagged as us", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });
    expect(regionsFor(db, "color").has("us")).toBe(true);
    db.close();
  });

  test("colour is tagged as gb, au, and ca", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });
    const regions = regionsFor(db, "colour");
    expect(regions.has("gb")).toBe(true);
    expect(regions.has("au")).toBe(true);
    expect(regions.has("ca")).toBe(true);
    db.close();
  });

  test("bonnet is tagged as gb", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });
    expect(regionsFor(db, "bonnet").has("gb")).toBe(true);
    db.close();
  });

  test("flashlight is tagged as us", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });
    expect(regionsFor(db, "flashlight").has("us")).toBe(true);
    db.close();
  });

  test("braw is tagged as scotland", () => {
    const db = new Database(TEST_DB_PATH, { readonly: true });
    expect(regionsFor(db, "braw").has("scotland")).toBe(true);
    db.close();
  });

  test("emits word_regions progress events", () => {
    const progressEvents: ExportProgress[] = [];
    const tempPath = "./test-regions-progress.db";
    try {
      exportToSQLite(lexicon, tempPath, {
        onProgress: (p) => progressEvents.push({ ...p }),
      });
      const phases = new Set(progressEvents.map((p) => p.phase));
      expect(phases.has("word_regions")).toBe(true);
    } finally {
      try {
        unlinkSync(tempPath);
      } catch {
        // ignore
      }
    }
  });
});

/**
 * Synsets that are valid `exemplifies` targets but represent non-regional
 * usage labels (slang, archaism, trademark, plural-form marker, etc.). Kept
 * in the test file (not the production code) because the production code
 * only acts on regional categories — this set exists solely to make the
 * comprehensiveness test enumerate every known target so a new one fails
 * the test instead of silently slipping through.
 *
 * If a future WordNet release adds a new `exemplifies` target, the
 * `REGION_EXEMPLIFIES is comprehensive` test below will fail and print the
 * synset id and its definition; classify it and either add it to
 * `REGION_EXEMPLIFIES` (if regional) or to this list (if non-regional).
 */
const KNOWN_NON_REGIONAL_EXEMPLIFIES: ReadonlySet<string> = new Set([
  "oewn-06858649-n", // trade name
  "oewn-06864792-n", // trademark
  "oewn-82526070-n", // basionym (taxonomic original name)
  "oewn-06306016-n", // plural-form marker
  "oewn-07087487-n", // archaism
  "oewn-07089193-n", // colloquialism
  "oewn-07171981-n", // argot/cant
  "oewn-06730109-n", // disparagement
  "oewn-06731706-n", // ethnic/racial slur
  "oewn-06731387-n", // disparaging remark
  "oewn-07139048-n", // obscenity
  "oewn-06977643-n", // French (foreign-language loanword tag, not an English region)
]);

describe("REGION_EXEMPLIFIES comprehensiveness", () => {
  test("every exemplifies target synset is classified", () => {
    const senseToSynset = new Map<string, string>();
    for (const entry of lexicon.lexicalEntries) {
      for (const sense of entry.senses) {
        senseToSynset.set(sense.id, sense.synset);
      }
    }

    const synsetById = new Map(lexicon.synsets.map((s) => [s.id, s]));
    const regionalSet = new Set(REGION_EXEMPLIFIES.map(([, id]) => id));

    const targets = new Set<string>();
    for (const entry of lexicon.lexicalEntries) {
      for (const sense of entry.senses) {
        for (const rel of sense.senseRelations) {
          if (rel.relType !== "exemplifies") continue;
          const targetSynsetId = senseToSynset.get(rel.target);
          if (targetSynsetId) targets.add(targetSynsetId);
        }
      }
    }

    // Sanity: at least the canonical regional categories must appear in the
    // current WordNet snapshot. If WordNet ever drops one, the test below
    // catches it via `unclassified` only when something *new* appears, so
    // this assertion guards the other direction (silent removal).
    for (const [region, synsetId] of REGION_EXEMPLIFIES) {
      expect(targets.has(synsetId)).toBe(true);
      // attach a useful failure label
      if (!targets.has(synsetId)) {
        throw new Error(
          `REGION_EXEMPLIFIES entry [${region}, ${synsetId}] is no longer an exemplifies target in this WordNet snapshot.`,
        );
      }
    }

    const unclassified: string[] = [];
    for (const synsetId of targets) {
      if (regionalSet.has(synsetId)) continue;
      if (KNOWN_NON_REGIONAL_EXEMPLIFIES.has(synsetId)) continue;
      const def =
        synsetById.get(synsetId)?.definitions[0]?.inner ?? "<no definition>";
      unclassified.push(`${synsetId} — ${def}`);
    }

    if (unclassified.length > 0) {
      throw new Error(
        `WordNet has new \`exemplifies\` target synset(s) not classified by REGION_EXEMPLIFIES or KNOWN_NON_REGIONAL_EXEMPLIFIES:\n  ${unclassified.join("\n  ")}\n\nIf regional, add to REGION_EXEMPLIFIES in src/export-sqlite.ts. Otherwise add to KNOWN_NON_REGIONAL_EXEMPLIFIES in src/export-sqlite.test.ts.`,
      );
    }
  });
});

describe("selective export", () => {
  const SUBSET_PATH = "./test-subset.db";

  afterAll(() => {
    try {
      unlinkSync(SUBSET_PATH);
    } catch {
      // ignore
    }
  });

  test("tables: ['words','synsets'] populates only those tables", () => {
    exportToSQLite(lexicon, SUBSET_PATH, {
      overwrite: true,
      tables: ["words", "synsets"],
    });

    const db = new Database(SUBSET_PATH, { readonly: true });

    const counts = (table: string) =>
      (db.query(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;

    expect(counts("words")).toBeGreaterThan(0);
    expect(counts("synsets")).toBeGreaterThan(0);
    expect(counts("word_synsets")).toBe(0);
    expect(counts("word_regions")).toBe(0);
    expect(counts("sense_relations")).toBe(0);
    expect(counts("synset_relations")).toBe(0);
    expect(counts("synset_examples")).toBe(0);

    db.close();
  });

  test("tables: ['word_regions'] alone throws naming missing dependencies", () => {
    expect(() =>
      exportToSQLite(lexicon, SUBSET_PATH, {
        overwrite: true,
        tables: ["word_regions"],
      }),
    ).toThrow(/word_regions/);

    expect(() =>
      exportToSQLite(lexicon, SUBSET_PATH, {
        overwrite: true,
        tables: ["word_regions"],
      }),
    ).toThrow(/words/);

    expect(() =>
      exportToSQLite(lexicon, SUBSET_PATH, {
        overwrite: true,
        tables: ["word_regions"],
      }),
    ).toThrow(/sense_relations/);
  });

  test("tables: ['bogus'] throws naming the unknown table", () => {
    expect(() =>
      exportToSQLite(lexicon, SUBSET_PATH, {
        overwrite: true,
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
        tables: ["bogus"] as any,
      }),
    ).toThrow(/bogus/);
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
