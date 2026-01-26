import { expect, setDefaultTimeout, test } from "bun:test";

setDefaultTimeout(60000);

import { parseLexicon, testFileParser } from "./parse_wordnet";
import type {
  Definition,
  Example,
  Form,
  ILIDefinition,
  Lemma,
  LexicalEntry,
  Pronunciation,
  Sense,
  SenseRelation,
  Synset,
  SynsetRelation,
} from "./types";

type IdRegistry = Map<string, void>;
type RefRegistry = Map<string, void>;

type IdsPack = {
  synsetIds: IdRegistry;
  senseIds: IdRegistry;
  lexicalEntryIds: IdRegistry;
  syntacticBehaviorsIds: IdRegistry;
};

type RefsPack = {
  senseSynsetRefs: RefRegistry;
  senseSubCatRefs: RefRegistry;
  senseRelationTargetRefs: RefRegistry;
  synsetMembersRefs: RefRegistry;
  synsetRelationTargetRefs: RefRegistry;
};

test("wordnet node relationships", async () => {
  const parser = await testFileParser();
  const lexicon = await parseLexicon(parser);
  expect(lexicon).toBeDefined();

  const synsetIds: IdRegistry = new Map();
  const senseIds: IdRegistry = new Map();
  const lexicalEntryIds: IdRegistry = new Map();
  const syntacticBehaviorsIds: IdRegistry = new Map();

  const senseSynsetRefs: RefRegistry = new Map();
  const senseSubCatRefs: RefRegistry = new Map();
  const senseRelationTargetRefs: RefRegistry = new Map();
  const synsetMembersRefs: RefRegistry = new Map();
  const synsetRelationTargetRefs: RefRegistry = new Map();

  expect(lexicon?.id).toBeString();
  expect(lexicon?.label).toBeString();
  expect(lexicon?.language).toBeString();
  expect(lexicon?.email).toBeString();
  expect(lexicon?.license).toBeString();
  expect(lexicon?.version).toBeString();
  expect(lexicon?.citation).toBeOneOf([expect.any(String), undefined]);
  expect(lexicon?.url).toBeString();
  lexicon?.lexicalEntries.forEach((le: LexicalEntry) => {
    lexicalEntryIds.set(le.id);
    le.lemmas.forEach((l: Lemma) => {
      expect(l.writtenForm).toBeDefined();
      expect(l.partOfSpeech).toBeDefined();
      l.pronunciations.forEach((p: Pronunciation) => {
        // variety is optional
        expect(p.inner).toBeDefined();
      });
    });
    le.senses.forEach((s: Sense) => {
      senseIds.set(s.id);
      senseSynsetRefs.set(s.synset);
      if (s.subCat) senseSubCatRefs.set(s.subCat);
      // adjPosition is optional
      s.senseRelations.forEach((sr: SenseRelation) => {
        expect(sr.relType).toBeDefined();
        // dcType is optional
        senseRelationTargetRefs.set(sr.target);
      });
    });
    le.forms.forEach((f: Form) => {
      expect(f.writtenForm).toBeDefined();
    });
  });
  lexicon?.synsets.forEach((s: Synset) => {
    synsetIds.set(s.id);
    expect(s.ili).toBeDefined();
    s.members.forEach((m) => {
      synsetMembersRefs.set(m);
    });
    expect(s.partOfSpeech).toBeDefined();
    expect(s.lexfile).toBeDefined();
    // dcSource is optional
    s.definitions.forEach((d: Definition) => {
      expect(d.inner).toBeDefined();
    });
    s.examples.forEach((e: Example) => {
      expect(e.inner).toBeDefined();
      // dcSource is optional
    });
    s.iliDefinitions.forEach((i: ILIDefinition) => {
      expect(i.inner).toBeDefined();
    });
    s.synsetRelations.forEach((sr: SynsetRelation) => {
      expect(sr.relType).toBeDefined();
      synsetRelationTargetRefs.set(sr.target);
    });
  });
  lexicon?.syntacticBehaviors.forEach((s) => {
    syntacticBehaviorsIds.set(s.id);
  });

  assertAllowedRelationships(
    {
      synsetIds,
      senseIds,
      lexicalEntryIds,
      syntacticBehaviorsIds,
    } satisfies IdsPack,
    {
      senseSynsetRefs,
      senseSubCatRefs,
      senseRelationTargetRefs,
      synsetMembersRefs,
      synsetRelationTargetRefs,
    } satisfies RefsPack,
    new Map([
      ["senseSubCatRefs > syntacticBehaviorsIds", undefined],
      ["senseRelationTargetRefs > senseIds", undefined],
      ["synsetMembersRefs > lexicalEntryIds", undefined],
      ["synsetRelationTargetRefs > synsetIds", undefined],
      ["senseSynsetRefs > synsetIds", undefined],
    ]),
  );
});

const assertAllowedRelationships = (
  idsPack: IdsPack,
  refsPack: RefsPack,
  allowed: Map<string, void>,
) => {
  const found = collectRelationships(idsPack, refsPack);
  found.forEach((_v, k) => {
    expect(allowed.has(k), `Disallowed relation: ${k}`).toBe(true);
  });
};

const collectRelationships = (idsPack: IdsPack, refsPack: RefsPack) => {
  const result: Map<string, void> = new Map();
  Object.entries(refsPack).forEach(([refPackKey, refPackRegistry]) => {
    Object.entries(idsPack).forEach(([idPackKey, idPackRegistry]) => {
      for (const ref of refPackRegistry.keys()) {
        if (idPackRegistry.has(ref)) {
          result.set(`${refPackKey} > ${idPackKey}`);
        }
      }
    });
  });
  return result;
  /*
  senseSynsetRefs > synsetIds
  senseSubCatRefs > syntacticBehaviorsIds
  senseRelationTargetRefs > senseIds
  synsetMembersRefs > lexicalEntryIds
  synsetRelationTargetRefs > synsetIds
  */
};
