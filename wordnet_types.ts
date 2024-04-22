import { z } from "zod";

export const LexiconId = z.string();
export const LexicalEntryId = z.string();
export const SynsetId = z.string();
export const SenseId = z.string();
export const SyntacticBehaviorId = z.string();

/** Note: only the literals that are found in the test wordnet xml file are listed */
export const PartsOfSpeech = z.union([
  z.literal("a"),
  z.literal("c"),
  z.literal("n"),
  z.literal("p"),
  z.literal("r"),
  z.literal("s"),
  z.literal("u"),
  z.literal("v"),
  z.literal("x"),
]);

/** Note: only the literals that are found in the test wordnet xml file are listed */
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

/** Note: only the literals that are found in the test wordnet xml file are listed */
export const SynsetRelationRelType = z.union([
  z.literal("also"),
  z.literal("attribute"),
  z.literal("cause"),
  z.literal("causes"),
  z.literal("domain_member_region"),
  z.literal("domain_member_topic"),
  z.literal("domain_region"),
  z.literal("domain_topic"),
  z.literal("entail"),
  z.literal("entails"),
  z.literal("exemplifies"),
  z.literal("has_domain_region"),
  z.literal("has_domain_topic"),
  z.literal("holo_member"),
  z.literal("holo_part"),
  z.literal("holo_substance"),
  z.literal("hypernym"),
  z.literal("hyponym"),
  z.literal("instance_hypernym"),
  z.literal("instance_hyponym"),
  z.literal("is_caused_by"),
  z.literal("is_entailed_by"),
  z.literal("is_exemplified_by"),
  z.literal("member_holonym"),
  z.literal("member_meronym"),
  z.literal("mero_member"),
  z.literal("mero_part"),
  z.literal("mero_substance"),
  z.literal("part_holonym"),
  z.literal("part_meronym"),
  z.literal("similar"),
  z.literal("substance_holonym"),
  z.literal("substance_meronym"),
]);

export const AdjPosition = z.union([
  z.literal("a"),
  z.literal("ip"),
  z.literal("p"),
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
  target: SenseId,
}).strict();

export const Sense = z.object({
  id: SenseId,
  synset: SynsetId,
  subCat: SyntacticBehaviorId.optional(),
  adjPosition: AdjPosition.optional(),
  senseRelations: z.array(SenseRelation).min(0),
}).strict();

export const Form = z.object({
  writtenForm: z.string(), // This is where huge variety lives
}).strict();

export const LexicalEntry = z.object({
  id: LexicalEntryId,
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
  target: SynsetId,
}).strict();

export const Synset = z.object({
  id: SynsetId,
  ili: z.string(),
  members: z.array(LexicalEntryId).min(1), // space-separated list of refs that we unwrap to array
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
  subcategorizationFrame: z.string(), // Sentence structure. This is where (not very huge) variety lives
}).strict();

export const Lexicon = z.object({
  id: LexiconId, // "oewn"
  label: z.string(), // "Open English WordNet"
  language: z.string(), // "en"
  email: z.string(), // "english-wordnet@googlegroups.com"
  license: z.string(), // "https://creativecommons.org/licenses/by/4.0/"
  version: z.string(), // "2023"
  url: z.string(), // "https://github.com/globalwordnet/english-wordnet">
  citation: z.string(), // "John P. McCrae, Alexandre Rademaker, Francis Bond, Ewa Rudnicka and Christiane Fellbaum (2019) English WordNet 2019 – An Open-Source WordNet for English, *Proceedings of the 10th Global WordNet Conference* – GWC 2019"
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
