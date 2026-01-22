import { expect, test, describe, beforeAll, setDefaultTimeout } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { ensureWordNetCached } from "./loader";
import {
  buildIndex,
  getDefinitions,
  getSynonyms,
  getHypernyms,
  getHyponyms,
  findWord,
  findSenses,
  findSynsets,
  getSynset,
  getSense,
  getLexicalEntry,
  getRelated,
  getSynsetWords,
  type WordNetIndex,
} from "./query";

setDefaultTimeout(120000);

const EXPECTED_DTD = "http://globalwordnet.github.io/schemas/WN-LMF-1.3.dtd";

let index: WordNetIndex;
let dataPath: string;
let version: string;

beforeAll(async () => {
  // Download latest WordNet to ./data/ if not present
  const result = await ensureWordNetCached({
    cacheDir: "./data",
    onProgress: console.log,
  });
  dataPath = result.filePath;
  version = result.version;

  const { loadWordNet } = await import("./loader");
  const lexicon = await loadWordNet(dataPath);
  index = buildIndex(lexicon);
});

describe("schema validation", () => {
  test("XML file has expected DOCTYPE declaration", () => {
    // Read first 500 bytes to check header
    const header = readFileSync(dataPath, { encoding: "utf-8", flag: "r" }).slice(0, 500);

    expect(header).toContain('<!DOCTYPE LexicalResource SYSTEM');
    expect(header).toContain(EXPECTED_DTD);
  });

  test("downloaded data file is valid XML", () => {
    const content = readFileSync(dataPath, { encoding: "utf-8", flag: "r" }).slice(0, 100);
    expect(content).toContain("<?xml");
    console.log(`Using WordNet ${version} from ${dataPath}`);
  });

  test("DTD URL is accessible", async () => {
    const response = await fetch(EXPECTED_DTD);
    expect(response.ok).toBe(true);
    const text = await response.text();
    expect(text).toContain("<!ELEMENT LexicalResource");
    expect(text).toContain("<!ELEMENT Lexicon");
  });

  test("uses latest available WordNet version from data/", () => {
    const files = readdirSync("./data");
    const versions = files
      .map((f) => f.match(/english-wordnet-(\d{4})\.xml/)?.[1])
      .filter((v): v is string => v !== undefined)
      .map((v) => parseInt(v, 10))
      .sort((a, b) => b - a); // newest first

    expect(versions.length).toBeGreaterThan(0);
    const latestAvailable = versions[0].toString();
    expect(version).toBe(latestAvailable);
    console.log(`Verified: using latest version ${version} (available: ${versions.join(", ")})`);
  });
});

describe("buildIndex", () => {
  test("creates index with all maps populated", () => {
    expect(index.synsets.size).toBeGreaterThan(100000);
    expect(index.senses.size).toBeGreaterThan(150000);
    expect(index.entries.size).toBeGreaterThan(100000);
    expect(index.byWord.size).toBeGreaterThan(100000);
  });
});

describe("findWord", () => {
  test("finds lexical entries for common word", () => {
    const entries = findWord(index, "dog");
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].lemmas[0].writtenForm.toLowerCase()).toBe("dog");
  });

  test("is case insensitive", () => {
    const lower = findWord(index, "dog");
    const upper = findWord(index, "DOG");
    const mixed = findWord(index, "DoG");
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBe(mixed.length);
  });

  test("returns empty array for unknown word", () => {
    const entries = findWord(index, "xyznonexistent");
    expect(entries).toEqual([]);
  });
});

describe("findSenses", () => {
  test("finds senses for word with multiple meanings", () => {
    const senses = findSenses(index, "bank");
    expect(senses.length).toBeGreaterThan(1);
  });
});

describe("findSynsets", () => {
  test("finds synsets for word", () => {
    const synsets = findSynsets(index, "happy");
    expect(synsets.length).toBeGreaterThan(0);
    expect(synsets[0].definitions.length).toBeGreaterThan(0);
  });
});

describe("getDefinitions", () => {
  test("returns DefinitionResult[] with text, synset, and partOfSpeech", () => {
    const defs = getDefinitions(index, "dog");
    expect(defs.length).toBeGreaterThan(0);

    const first = defs[0];
    expect(first.text).toBeDefined();
    expect(typeof first.text).toBe("string");
    expect(first.synset).toBeDefined();
    expect(first.synset.id).toBeDefined();
    expect(first.partOfSpeech).toBeDefined();
  });

  test("includes noun and verb definitions for 'run'", () => {
    const defs = getDefinitions(index, "run");
    const partsOfSpeech = new Set(defs.map((d) => d.partOfSpeech));
    expect(partsOfSpeech.has("n")).toBe(true);
    expect(partsOfSpeech.has("v")).toBe(true);
  });

  test("returns empty array for unknown word", () => {
    const defs = getDefinitions(index, "xyznonexistent");
    expect(defs).toEqual([]);
  });
});

describe("getSynonyms", () => {
  test("returns SynonymResult[] with word, entry, and synset", () => {
    const syns = getSynonyms(index, "happy");
    expect(syns.length).toBeGreaterThan(0);

    const first = syns[0];
    expect(first.word).toBeDefined();
    expect(typeof first.word).toBe("string");
    expect(first.entry).toBeDefined();
    expect(first.entry.id).toBeDefined();
    expect(first.synset).toBeDefined();
    expect(first.synset.id).toBeDefined();
  });

  test("does not include the queried word in results", () => {
    const syns = getSynonyms(index, "happy");
    const words = syns.map((s) => s.word.toLowerCase());
    expect(words.includes("happy")).toBe(false);
  });

  test("returns empty array for word with no synonyms", () => {
    const syns = getSynonyms(index, "xyznonexistent");
    expect(syns).toEqual([]);
  });
});

describe("getHypernyms", () => {
  test("returns Synset[] for hypernyms", () => {
    const hypernyms = getHypernyms(index, "dog");
    expect(hypernyms.length).toBeGreaterThan(0);
    expect(hypernyms[0].id).toBeDefined();
    expect(hypernyms[0].definitions.length).toBeGreaterThan(0);
  });

  test("dog has canine as hypernym", () => {
    const hypernyms = getHypernyms(index, "dog");
    const allWords = hypernyms.flatMap((h) => getSynsetWords(index, h));
    const hasCanine = allWords.some(
      (w) => w.toLowerCase().includes("canine") || w.toLowerCase().includes("domestic animal")
    );
    expect(hasCanine).toBe(true);
  });
});

describe("getHyponyms", () => {
  test("returns Synset[] for hyponyms", () => {
    const hyponyms = getHyponyms(index, "dog");
    expect(hyponyms.length).toBeGreaterThan(0);
  });

  test("dog has specific breeds as hyponyms", () => {
    const hyponyms = getHyponyms(index, "dog");
    const allWords = hyponyms.flatMap((h) => getSynsetWords(index, h));
    // Should have some dog breeds
    expect(allWords.length).toBeGreaterThan(5);
  });
});

describe("getRelated", () => {
  test("gets related synsets by relation type", () => {
    const synsets = findSynsets(index, "dog");
    expect(synsets.length).toBeGreaterThan(0);

    const related = getRelated(index, synsets[0], "hypernym");
    expect(related.length).toBeGreaterThan(0);
  });
});

describe("getSynset / getSense / getLexicalEntry", () => {
  test("getSynset retrieves by ID", () => {
    const synsets = findSynsets(index, "cat");
    expect(synsets.length).toBeGreaterThan(0);

    const id = synsets[0].id;
    const retrieved = getSynset(index, id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(id);
  });

  test("getSense retrieves by ID", () => {
    const senses = findSenses(index, "cat");
    expect(senses.length).toBeGreaterThan(0);

    const id = senses[0].id;
    const retrieved = getSense(index, id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(id);
  });

  test("getLexicalEntry retrieves by ID", () => {
    const entries = findWord(index, "cat");
    expect(entries.length).toBeGreaterThan(0);

    const id = entries[0].id;
    const retrieved = getLexicalEntry(index, id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(id);
  });
});

describe("getSynsetWords", () => {
  test("returns words for a synset", () => {
    const synsets = findSynsets(index, "happy");
    expect(synsets.length).toBeGreaterThan(0);

    const words = getSynsetWords(index, synsets[0]);
    expect(words.length).toBeGreaterThan(0);
    expect(words.some((w) => w.toLowerCase() === "happy")).toBe(true);
  });
});
