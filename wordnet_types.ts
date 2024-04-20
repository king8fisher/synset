import { z } from "zod";

export const Id = z.string();
export const SynsetId = z.string();
export const SyntacticBehaviorId = z.string();

/**
```
n: Noun
v: Verb
a: Adjective
r: Adverb
s: Adjective Satellite
c: Conjunction
p: Adposition (Preposition, postposition, etc.)
x: Other (inc. particle, classifier, bound morphemes, determiners)
u: Unknown
```
*/
export const PartsOfSpeech = z.union([
  z.literal("n"),
  z.literal("v"),
  z.literal("a"),
  z.literal("r"),
  z.literal("s"),
  z.literal("c"),
  z.literal("p"),
  z.literal("x"),
  z.literal("u"),
]);

export const SenseRelationRelType = z.union([
  z.literal("also"),
  z.literal("antonym"),
  z.literal("derivation"),
  z.literal("domain_member_region"),
  z.literal("domain_member_topic"),
  z.literal("domain_region"),
  z.literal("domain_topic"),
  z.literal("exemplifies"),
  z.literal("is_exemplified_by"),
  z.literal("other"), // TODO: Then "dc:type" attribute should define what relation
  z.literal("participle"),
  z.literal("pertainym"),
  z.literal("similar"),
]);

export const SynsetRelationRelType = z.union([
  z.literal("hypernym"),
  z.literal("hyponym"),
  z.literal("instance_hypernym"),
  z.literal("instance_hyponym"),
  z.literal("part_holonym"),
  z.literal("part_meronym"),
  z.literal("member_holonym"),
  z.literal("member_meronym"),
  z.literal("substance_holonym"),
  z.literal("substance_meronym"),
  z.literal("entail"),
  z.literal("cause"),
  z.literal("similar"),
  z.literal("also"),
  z.literal("attribute"),
  z.literal("domain_topic"),
  z.literal("domain_member_topic"),
  z.literal("domain_region"),
  z.literal("domain_member_region"),
  z.literal("exemplifies"),
  z.literal("is_exemplified_by"),
  z.literal("holo_part"),
  z.literal("mero_part"),
  z.literal("has_domain_topic"),
  z.literal("mero_substance"),
  z.literal("holo_member"),
  z.literal("holo_substance"),
  z.literal("mero_member"),
  z.literal("is_entailed_by"),
  z.literal("entails"),
  z.literal("causes"),
  z.literal("is_caused_by"),
  z.literal("has_domain_region"),
]);

export const Pronunciation = z.object({
  variety: z.string().optional(), // TODO: "GB", "US", ...
  inner: z.string(), // Actual value
}).strict();

export const Lemma = z.object({
  writtenForm: z.string(), // Actual value
  partOfSpeech: PartsOfSpeech,
  pronunciations: z.array(Pronunciation).min(0),
}).strict();

export const SenseRelation = z.object({
  relType: SenseRelationRelType,
  dcType: z.string().optional(), // TODO: This is only when relType is "other"
  target: z.string(), // TODO Where this leads to
}).strict();

export const AdjPosition = z.union([
  z.literal("a"),
  z.literal("p"),
  z.literal("ip"),
]);

export const Sense = z.object({
  id: Id,
  synset: SynsetId,
  subCat: SyntacticBehaviorId.optional(),
  adjPosition: AdjPosition.optional(),
  senseRelations: z.array(SenseRelation).min(0),
}).strict();

export const Form = z.object({
  writtenForm: z.string(), // This is where huge variety lives
}).strict();

export const LexicalEntry = z.object({
  id: Id,
  lemmas: z.array(Lemma).length(1),
  senses: z.array(Sense).min(1),
  forms: z.array(Form).min(0),
}).strict();

export const Definition = z.object({
  inner: z.string(), // Actual value
}).strict();

export const Example = z.object({
  inner: z.string(), // Actual value
  dcSource: z.string().optional(),
}).strict();

export const ILIDefinition = z.object({
  inner: z.string(), // Actual value
}).strict();

export const SynsetRelation = z.object({
  relType: SynsetRelationRelType,
  target: z.string(), // TODO Where this leads to?
}).strict();

export const Synset = z.object({
  id: Id,
  ili: z.string(),
  members: z.string(), // space-separated list
  partOfSpeech: PartsOfSpeech,
  lexfile: z.string(),
  dcSource: z.string().optional(),
  definitions: z.array(Definition).min(1),
  examples: z.array(Example).min(0),
  iliDefinitions: z.array(ILIDefinition).min(0),
  synsetRelations: z.array(SynsetRelation).min(0),
}).strict();

export const SyntacticBehavior = z.object({
  id: SyntacticBehaviorId,
  subcategorizationFrame: z.string(), // This is where huge variety lives
}).strict();

export const Lexicon = z.object({
  id: Id, // "oewn"
  label: z.string(), // "Open English WordNet"
  language: z.string(), // "en"
  email: z.string(), // "english-wordnet@googlegroups.com"
  license: z.string(), // "https://creativecommons.org/licenses/by/4.0/"
  version: z.string(), // "2023"
  citation: z.string(), // "John P. McCrae, Alexandre Rademaker, Francis Bond, Ewa Rudnicka and Christiane Fellbaum (2019) English WordNet 2019 – An Open-Source WordNet for English, *Proceedings of the 10th Global WordNet Conference* – GWC 2019"
  url: z.string(), // "https://github.com/globalwordnet/english-wordnet">
  lexicalEntries: z.array(LexicalEntry).min(0),
  synsets: z.array(Synset).min(0),
  syntacticBehaviors: z.array(SyntacticBehavior).min(0),
}).strict();

export type Lemma = z.infer<typeof Lemma>;
export type LexicalEntry = z.infer<typeof LexicalEntry>;
export type Sense = z.infer<typeof Sense>;
export type SenseRelation = z.infer<typeof SenseRelation>;
export type Pronunciation = z.infer<typeof Pronunciation>;
export type Form = z.infer<typeof Form>;
export type Synset = z.infer<typeof Synset>;
export type Definition = z.infer<typeof Definition>;
export type Example = z.infer<typeof Example>;
export type ILIDefinition = z.infer<typeof ILIDefinition>;
export type SynsetRelation = z.infer<typeof SynsetRelation>;
export type SyntacticBehavior = z.infer<typeof SyntacticBehavior>;
export type Lexicon = z.infer<typeof Lexicon>;

export const partsOfSpeechList: string[] = PartsOfSpeech
  .options.map((v) => v.value);
