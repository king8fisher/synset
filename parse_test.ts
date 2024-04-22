import { assert } from "$std/assert/assert.ts";
import {
  assertArrayIncludes,
  assertEquals,
  assertGreater,
} from "$std/assert/mod.ts";
import { Node } from "@dbushell/xml-streamify";
import {
  DefinitionNode,
  ExampleNode,
  FormNode,
  ILIDefinitionNode,
  LemmaNode,
  LexicalEntryNode,
  LexiconNode,
  PronunciationNode,
  SenseNode,
  SenseRelationNode,
  SynsetNode,
  SynsetRelationNode,
  SyntacticBehaviorNode,
} from "~/parse_node_helpers.ts";
import { testFileParser, version } from "./parse_wordnet.ts";
import { partsOfSpeechList } from "./wordnet_types.ts";

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

const assertNodeParentType = (node: Node, type: string) => {
  assert(
    node.parent && node.parent.type == type,
    `${node.type} should have a ${type} parent, but was ${node.parent?.type} instead`,
  );
};

Deno.test("validate wordnet xml", async () => {
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
        const lexicon = LexiconNode(node);
        assert(lexicon != undefined);
        assertEquals(lexicon.version, version);
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
        const _ = SyntacticBehaviorNode(node);
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
