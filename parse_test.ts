import { assert } from "$std/assert/assert.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { assertArrayIncludes, assertEquals } from "$std/assert/mod.ts";
import { existsSync } from "$std/fs/exists.ts";
import { parse } from "@dbushell/xml-streamify";
import { partsOfSpeechList } from "~/xml_types.ts";

const version = "2023";
const fileName = `english-wordnet-${version}.xml`;
const localFileName = `./data/${fileName}`;

const testFilePath = async () => {
  const path = await Deno.realPath(localFileName);
  return path;
};

const testFileExists = async () => {
  if (existsSync(localFileName)) {
    const path = await Deno.realPath(localFileName);
    const stat = await Deno.stat(path);
    return stat.isFile;
  }
  return false;
};

const fetchTestFile = async () => {
  const src = await fetch(
    `https://en-word.net/static/${fileName}.gz`,
  );
  const dest = await Deno.open(localFileName, {
    create: true,
    write: true,
  });
  if (src.body == null) return;
  await src.body
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeTo(dest.writable);
};

const testFileParser = async () => {
  if (!await testFileExists()) {
    console.log("unzipping");
    await fetchTestFile();
  }
  const p = await testFilePath();

  const parser = parse(`file:///${p.replace("\\", "/")}`, {
    ignoreDeclaration: false,
    silent: false,
  });
  return parser;
};

Deno.test("quotes", async () => {
  const parser = await testFileParser();

  const expect = [
    { lemma: "tailor", count: 2 }, // "v" and "n"
    { lemma: "guard", count: 2 }, // "v" and "n"
    { lemma: "tailor's tack", count: 1 },
    { lemma: "Aladdin", count: 1 },
    { lemma: "Aladdin's lamp", count: 1 },
  ];
  const found: Map<string, number> = new Map();

  let count = 0;

  for await (const node of parser) {
    if (node.type == "Lemma") {
      const writtenForm = node.attributes["writtenForm"];

      expect.forEach((v) => {
        if (writtenForm == v.lemma) {
          found.set(v.lemma, (found.get(v.lemma) || 0) + 1);
          console.log(node.raw);
        }
      });
      count++;
    }
  }

  for (const e of expect) {
    const f = found.get(e.lemma) || 0;
    assertEquals(
      f,
      e.count,
      `should be ${e.count} of "${e.lemma}" lemmas, found ${f} instead`,
    );
  }
  console.log(`${count} lemmas processed`);
});

Deno.test("count nodes", async () => {
  const parser = await testFileParser();
  let count = 0;
  const start = performance.now();
  for await (const _node of parser) {
    count++;
  }
  console.log(
    `${count} nodes`,
    `${((performance.now() - start) / 1000).toFixed(2)}s`,
  );
});

Deno.test("valid xml data", async () => {
  const parser = await testFileParser();
  const partsOfSpeech: Map<string, number> = new Map();
  let lexicalEntries = 0;
  for await (const node of parser) {
    if (node.type == "Lemma") {
      assertEquals(
        Object.keys(node.attributes).length,
        2,
        "2 attributes are expected in every Lemma",
      );
      assert(
        "writtenForm" in node.attributes,
        "writtenForm should be in Lemma",
      );
      assert(
        "partOfSpeech" in node.attributes,
        "partOfSpeech should be in Lemma",
      );

      const p = node.attributes.partOfSpeech;

      assertArrayIncludes(
        partsOfSpeechList,
        [p],
        `should be one of known parts of speech: ${partsOfSpeechList}`,
      );
      let cnt = 0;
      if (partsOfSpeech.has(p)) {
        cnt = partsOfSpeech.get(p)!;
      } else {
        cnt = 1;
      }
      partsOfSpeech.set(p, cnt + 1);
    } else if (node.type == "LexicalEntry") {
      lexicalEntries++;
      assertEquals(
        Object.keys(node.attributes).length,
        1,
        "1 attributes are expected in every LexicalEntry",
      );
      assert(
        "id" in node.attributes,
        "id should be in LexicalEntry",
      );
    }
  }
  console.log("partsOfSpeech", partsOfSpeech);
  assertEquals(
    partsOfSpeechList.sort(),
    Array.from(partsOfSpeech.keys()).sort(),
    `partsOfSpeechList should match found parts of speech`,
  );
  assert(
    partsOfSpeech.size == partsOfSpeechList.length,
    "there should be the same amount of different parts of speech found as in the known list",
  );
  assert(lexicalEntries > 0, "there should be LexicalEntry nodes");
});

Deno.test("attributes", async () => {
  const parser = await testFileParser();
  let count = 0;
  for await (const node of parser) {
    if (node.type == "Lemma") {
      const writtenForm = node.attributes["writtenForm"];
      if (writtenForm == "Aladdin's lamp") {
        assertEquals(node.attributes, {
          writtenForm: "Aladdin's lamp",
          partOfSpeech: "n",
        });
        count++;
        assertExists(node.parent);
        assertEquals("LexicalEntry", node.parent.type);
        assertEquals("oewn-Aladdin-ap-s_lamp-n", node.parent.attributes["id"]);
        assertExists(node.parent.parent);
        console.log(node.parent.parent.raw);
        assertEquals("Lexicon", node.parent.parent.type);
        assertEquals(
          "Open English WordNet",
          node.parent.parent.attributes["label"],
        );
        assertEquals(
          version,
          node.parent.parent.attributes["version"],
        );
      }
    }
  }
  assertEquals(count, 1, "should be one entry found");
});

// deno-lint-ignore no-explicit-any
export function measureExecutionTime<T extends (...args: unknown[]) => any>(
  func: T,
): (...args: Parameters<T>) => { result: ReturnType<T>; time: number } {
  return (...args: Parameters<T>): { result: ReturnType<T>; time: number } => {
    const start = performance.now();
    const result = func(...args);
    const end = performance.now();
    const time = end - start;
    return { result, time };
  };
}
