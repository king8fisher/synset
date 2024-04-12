import { assert } from "$std/assert/assert.ts";
import {
  assertArrayIncludes,
  assertEquals,
  assertGreater,
} from "$std/assert/mod.ts";
import { existsSync } from "$std/fs/exists.ts";
import { Node, parse } from "@dbushell/xml-streamify";
import {
  adjPositionSchema,
  Definition,
  definitionSchema,
  Example,
  exampleSchema,
  Form,
  formSchema,
  ILIDefinition,
  iliDefinitionSchema,
  Lemma,
  lemmaSchema,
  LexicalEntry,
  lexicalEntrySchema,
  partsOfSpeechList,
  partsOfSpeechSchema,
  Pronunciation,
  pronunciationSchema,
  Sense,
  SenseRelation,
  senseRelationSchema,
  senseSchema,
  Synset,
  synsetIdSchema,
  SynsetRelation,
  synsetRelationSchema,
  synsetSchema,
  SyntacticBehavior,
  syntacticBehaviorSchema,
} from "~/xml_types.ts";

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

Deno.test("partsOfSpeechList", () => {
  assertEquals(partsOfSpeechList, [
    "n",
    "v",
    "a",
    "r",
    "s",
    "c",
    "p",
    "x",
    "u",
  ]);
});

function assertNodeParentType(node: Node, type: string) {
  assert(
    node.parent && node.parent.type == type,
    `${node.type} should have a ${type} parent, but was ${node.parent?.type} instead`,
  );
}

function PronunciationNode(node: Node): Pronunciation {
  const obj = Object.assign({}, {
    variety: node.attributes["variety"],
    inner: node.innerText,
  });
  return pronunciationSchema.parse(obj);
}

function LemmaNode(node: Node): Lemma {
  const obj = Object.assign({}, {
    writtenForm: node.attributes["writtenForm"],
    partOfSpeech: partsOfSpeechSchema.parse(node.attributes["partOfSpeech"]),
    pronunciations: node.children.filter((v) => v.type == "Pronunciation").map(
      (v) => {
        return PronunciationNode(v);
      },
    ),
  });
  return lemmaSchema.parse(obj);
}

function SenseRelationNode(node: Node): SenseRelation {
  return senseRelationSchema.parse({
    relType: node.attributes["relType"],
    target: node.attributes["target"],
    dcType: node.attributes["dc:type"],
  });
}

function SenseNode(node: Node): Sense {
  const obj: Sense = {
    id: node.attributes["id"],
    synset: synsetIdSchema.parse(node.attributes["synset"]),
    senseRelations: node.children.filter((v) => v.type == "SenseRelation").map(
      (v) => {
        return SenseRelationNode(v);
      },
    ),
    subCat: node.attributes["subcat"],
    adjPosition: node.attributes["adjposition"]
      ? adjPositionSchema.parse(node.attributes["adjposition"])
      : undefined,
  };
  return senseSchema.parse(obj);
}

function FormNode(node: Node): Form {
  return formSchema.parse(
    { writtenForm: node.attributes["writtenForm"] },
  );
}

function LexicalEntryNode(node: Node): LexicalEntry {
  const obj: LexicalEntry = {
    id: node.attributes["id"],
    lemmas: node.children.filter((v) => v.type == "Lemma").map((v) => {
      return LemmaNode(v);
    }),
    senses: node.children.filter((v) => v.type == "Sense").map((v) => {
      return SenseNode(v);
    }),
    forms: node.children.filter((v) => v.type == "Form").map((v) => {
      return FormNode(v);
    }),
  };
  return lexicalEntrySchema.parse(obj);
}

function DefinitionNode(node: Node): Definition {
  const obj = {
    inner: node.innerText,
  };
  return definitionSchema.parse(obj);
}

function ExampleNode(node: Node): Example {
  const obj = {
    inner: node.innerText,
  };
  return exampleSchema.parse(obj);
}

function ILIDefinitionNode(node: Node): ILIDefinition {
  const obj = {
    inner: node.innerText,
  };
  return iliDefinitionSchema.parse(obj);
}

function SynsetRelationNode(node: Node): SynsetRelation {
  const obj = {
    relType: node.attributes["relType"],
    target: node.attributes["target"],
  };
  return synsetRelationSchema.parse(obj);
}

function SyntacticBehaviourNode(node: Node): SyntacticBehavior {
  const obj: SyntacticBehavior = {
    id: node.attributes["id"],
    subcategorizationFrame: node.attributes["subcategorizationFrame"],
  };
  return syntacticBehaviorSchema.parse(obj);
}

function SynsetNode(node: Node): Synset {
  const obj: Synset = {
    id: node.attributes["id"],
    ili: node.attributes["ili"],
    lexfile: node.attributes["lexfile"],
    members: node.attributes["members"],
    partOfSpeech: partsOfSpeechSchema.parse(node.attributes["partOfSpeech"]),
    definitions: node.children.filter((v) => v.type == "Definition").map(
      (v) => DefinitionNode(v),
    ),
    examples: node.children.filter((v) => v.type == "Example").map(
      (v) => ExampleNode(v),
    ),
    iliDefinitions: node.children.filter((v) => v.type == "ILIDefinition").map(
      (v) => ILIDefinitionNode(v),
    ),
    synsetRelations: node.children.filter((v) => v.type == "SynsetRelation")
      .map(
        (v) => SynsetRelationNode(v),
      ),
  };
  return synsetSchema.parse(obj);
}

Deno.test("valid xml data", async () => {
  const start = performance.now();
  const parser = await testFileParser();
  const partsOfSpeech: Map<string, number> = new Map();
  let lexicalResource = 0;
  let lexicalEntries = 0;
  let lemmas = 0;
  let lexicons = 0;
  let senses = 0;
  let synsets = 0;
  for await (const node of parser) {
    switch (node.type) {
      case "LexicalResource": {
        lexicalResource++;
        assert(
          node.parent !== undefined,
          `LexicalResource parent should not undefined`,
        );
        assert(
          node.parent.type === "@document",
          `LexicalResource parent should be @document`,
        );
        assert(
          node.parent.parent === undefined,
          `LexicalResource grandparent should be undefined`,
        );
        break;
      }
      case "Lexicon": {
        lexicons++;
        assertNodeParentType(node, "LexicalResource");
        break;
      }
      case "LexicalEntry": {
        lexicalEntries++;
        assertNodeParentType(node, "Lexicon");
        assertEquals(
          Object.keys(node.attributes).length,
          1,
          "1 attribute is expected in every LexicalEntry",
        );
        assert(
          "id" in node.attributes,
          "id attribute should be in LexicalEntry",
        );

        const _ = LexicalEntryNode(node);
        break;
      }
      case "Lemma": {
        lemmas++;
        assertNodeParentType(node, "LexicalEntry");
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

        const _ = LemmaNode(node);
        break;
      }
      case "Sense": {
        senses++;
        assertNodeParentType(node, "LexicalEntry");
        const _ = SenseNode(node);
        break;
      }
      case "SenseRelation": {
        assertNodeParentType(node, "Sense");
        const _ = SenseRelationNode(node);
        break;
      }
      case "Pronunciation": {
        assertNodeParentType(node, "Lemma");
        const _ = PronunciationNode(node);
        break;
      }
      case "Form": {
        assertNodeParentType(node, "LexicalEntry");
        const _ = FormNode(node);
        break;
      }
      case "Synset": {
        synsets++;
        assertNodeParentType(node, "Lexicon");
        const _ = SynsetNode(node);
        break;
      }
      case "Definition": {
        assertNodeParentType(node, "Synset");
        const _ = DefinitionNode(node);
        break;
      }
      case "Example": {
        assertNodeParentType(node, "Synset");
        const _ = ExampleNode(node);
        break;
      }
      case "ILIDefinition": {
        assertNodeParentType(node, "Synset");
        const _ = ILIDefinitionNode(node);
        break;
      }
      case "SynsetRelation": {
        assertNodeParentType(node, "Synset");
        const _ = SynsetRelationNode(node);
        break;
      }
      case "SyntacticBehaviour": {
        assertNodeParentType(node, "Lexicon");
        const _ = SyntacticBehaviourNode(node);
        break;
      }
      case "declaration": {
        // Supposedly, xml declaration node
        break;
      }
      default: {
        throw new Error("Unknown node type: " + node.type);
      }
    }
  }
  console.log("partsOfSpeech", partsOfSpeech);
  assert(
    Array.from(partsOfSpeech.keys()).length <= partsOfSpeechList.length,
    `discovered different parts of speech count should be within known parts of speech amounts`,
  );

  assertEquals(
    lexicalResource,
    1,
  );
  assertGreater(
    lexicons,
    0,
    "non-zero amount of Lexicon nodes",
  );
  assertGreater(
    lexicalEntries,
    0,
    "non-zero amount of LexicalEntry nodes",
  );
  assertGreater(
    lemmas,
    0,
    "non-zero amount of Lemma nodes",
  );
  assertGreater(
    senses,
    0,
    "non-zero amount of Sense nodes",
  );
  assertGreater(
    synsets,
    0,
    "non-zero amount of Synset nodes",
  );
  console.log(
    `${((performance.now() - start) / 1000).toFixed(2)}s`,
  );
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
