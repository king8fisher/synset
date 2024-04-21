import { assert } from "$std/assert/assert.ts";
import { parseLexicon, testFileParser } from "~/parse_wordnet.ts";
import {
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
} from "~/wordnet_types.ts";

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

Deno.test("wordnet node relationships", async () => {
  const parser = await testFileParser();
  const lexicon = await parseLexicon(parser);
  assert(lexicon != undefined);

  const synsetIds: IdRegistry = new Map();
  const senseIds: IdRegistry = new Map();
  const lexicalEntryIds: IdRegistry = new Map();
  const syntacticBehaviorsIds: IdRegistry = new Map();

  const senseSynsetRefs: RefRegistry = new Map();
  const senseSubCatRefs: RefRegistry = new Map();
  const senseRelationTargetRefs: RefRegistry = new Map();
  const synsetMembersRefs: RefRegistry = new Map();
  const synsetRelationTargetRefs: RefRegistry = new Map();

  lexicon.id;
  lexicon.label;
  lexicon.language;
  lexicon.email;
  lexicon.license;
  lexicon.version;
  lexicon.citation;
  lexicon.url;
  lexicon.lexicalEntries.forEach(
    (le: LexicalEntry) => {
      lexicalEntryIds.set(le.id);
      le.lemmas.forEach((l: Lemma) => {
        l.writtenForm; //
        l.partOfSpeech; //
        l.pronunciations.forEach((p: Pronunciation) => {
          p.variety;
          p.inner;
        });
      });
      le.senses.forEach((s: Sense) => {
        senseIds.set(s.id);
        senseSynsetRefs.set(s.synset);
        if (s.subCat) senseSubCatRefs.set(s.subCat);
        s.adjPosition; //
        s.senseRelations.forEach((sr: SenseRelation) => {
          sr.relType;
          sr.dcType;
          senseRelationTargetRefs.set(sr.target);
        });
      });
      le.forms.forEach((f: Form) => {
        f.writtenForm;
      });
    },
  );
  lexicon.synsets.forEach((s: Synset) => {
    synsetIds.set(s.id);
    s.ili;
    s.members.forEach((m) => {
      synsetMembersRefs.set(m);
    });
    s.partOfSpeech;
    s.lexfile;
    s.dcSource;
    s.definitions.forEach((d: Definition) => {
      d.inner;
    });
    s.examples.forEach((e: Example) => {
      e.inner;
      e.dcSource;
    });
    s.iliDefinitions.forEach((i: ILIDefinition) => {
      i.inner;
    });
    s.synsetRelations.forEach((s: SynsetRelation) => {
      s.relType;
      synsetRelationTargetRefs.set(s.target);
    });
  });
  lexicon.syntacticBehaviors.forEach((s) => syntacticBehaviorsIds.set(s.id));

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
    assert(allowed.has(k), "Disallowed relation: " + k);
  });
};

const collectRelationships = (idsPack: IdsPack, refsPack: RefsPack) => {
  const result: Map<string, void> = new Map();
  Object.entries(refsPack).forEach(([refPackKey, refPackRegistry]) => {
    Object.entries(idsPack).forEach(([idPackKey, idPackRegistry]) => {
      for (const ref of refPackRegistry.keys()) {
        if (idPackRegistry.has(ref)) {
          result.set(refPackKey + " > " + idPackKey);
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
