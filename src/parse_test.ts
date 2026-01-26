import { expect, setDefaultTimeout, test } from "bun:test";
import type { Node } from "@dbushell/xml-streamify";
import {
  DefinitionNode,
  decodeXmlEntities,
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
} from "./helpers";
import { testFileParser, version } from "./parse_wordnet";
import { partsOfSpeechList } from "./types";

setDefaultTimeout(60000);

const assertNodeParentType = (node: Node, type: string) => {
  expect(
    node.parent && node.parent.type === type,
    `${node.type} should have a ${type} parent, but was ${node.parent?.type} instead`,
  ).toBe(true);
};

test("quotes", async () => {
  const parser = await testFileParser();

  const expectedItems = [
    { lemma: "tailor", count: 2 }, // "v" and "n"
    { lemma: "guard", count: 2 }, // "v" and "n"
    { lemma: "tailor's tack", count: 1 },
    { lemma: "Aladdin's lamp", count: 1 },
  ];
  const found: Map<string, number> = new Map();

  let count = 0;

  for await (const node of parser) {
    if (node.type === "Lemma") {
      const writtenForm = decodeXmlEntities(node.attributes.writtenForm);

      expectedItems.forEach((v) => {
        if (writtenForm === v.lemma) {
          found.set(v.lemma, (found.get(v.lemma) || 0) + 1);
          console.log(node.raw);
        }
      });
      count++;
    }
  }

  for (const e of expectedItems) {
    const f = found.get(e.lemma) || 0;
    expect(f).toBe(e.count);
  }
  console.log(`${count} lemmas processed`);
});

test("validate wordnet xml", async () => {
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
        expect(
          node.parent !== undefined,
          `LexicalResource parent should not undefined`,
        ).toBe(true);
        expect(
          node.parent?.type === "@document",
          `LexicalResource parent should be @document`,
        ).toBe(true);
        expect(
          node.parent?.parent === undefined,
          `LexicalResource grandparent should be undefined`,
        ).toBe(true);
        break;
      }
      case "Lexicon": {
        lexicons++;
        assertNodeParentType(node, "LexicalResource");
        const lexicon = LexiconNode(node);
        expect(lexicon).toBeDefined();
        expect(lexicon.version).toBe(version);
        break;
      }
      case "LexicalEntry": {
        lexicalEntries++;
        assertNodeParentType(node, "Lexicon");
        expect(Object.keys(node.attributes).length).toBe(1);
        expect("id" in node.attributes).toBe(true);

        LexicalEntryNode(node);
        break;
      }
      case "Lemma": {
        lemmas++;
        assertNodeParentType(node, "LexicalEntry");
        expect(Object.keys(node.attributes).length).toBe(2);
        expect("writtenForm" in node.attributes).toBe(true);
        expect("partOfSpeech" in node.attributes).toBe(true);

        const p = node.attributes.partOfSpeech;

        expect(partsOfSpeechList).toContain(p);
        const cnt = partsOfSpeech.get(p) ?? 0;
        partsOfSpeech.set(p, cnt + 1);

        LemmaNode(node);
        break;
      }
      case "Sense": {
        senses++;
        assertNodeParentType(node, "LexicalEntry");
        SenseNode(node);
        break;
      }
      case "SenseRelation": {
        assertNodeParentType(node, "Sense");
        SenseRelationNode(node);
        break;
      }
      case "Pronunciation": {
        assertNodeParentType(node, "Lemma");
        PronunciationNode(node);
        break;
      }
      case "Form": {
        assertNodeParentType(node, "LexicalEntry");
        FormNode(node);
        break;
      }
      case "Synset": {
        synsets++;
        assertNodeParentType(node, "Lexicon");
        SynsetNode(node);
        break;
      }
      case "Definition": {
        assertNodeParentType(node, "Synset");
        DefinitionNode(node);
        break;
      }
      case "Example": {
        assertNodeParentType(node, "Synset");
        ExampleNode(node);
        break;
      }
      case "ILIDefinition": {
        assertNodeParentType(node, "Synset");
        ILIDefinitionNode(node);
        break;
      }
      case "SynsetRelation": {
        assertNodeParentType(node, "Synset");
        SynsetRelationNode(node);
        break;
      }
      case "SyntacticBehaviour": {
        assertNodeParentType(node, "Lexicon");
        SyntacticBehaviorNode(node);
        break;
      }
      case "declaration": {
        // Supposedly, xml declaration node
        break;
      }
      default: {
        throw new Error(`Unknown node type: ${node.type}`);
      }
    }
  }
  console.log("partsOfSpeech", partsOfSpeech);
  expect(Array.from(partsOfSpeech.keys()).length).toBeLessThanOrEqual(
    partsOfSpeechList.length,
  );

  expect(lexicalResource).toBe(1);
  expect(lexicons).toBeGreaterThan(0);
  expect(lexicalEntries).toBeGreaterThan(0);
  expect(lemmas).toBeGreaterThan(0);
  expect(senses).toBeGreaterThan(0);
  expect(synsets).toBeGreaterThan(0);
  console.log(`${((performance.now() - start) / 1000).toFixed(2)}s`);
});
