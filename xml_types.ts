import { z } from "zod";

export const idSchema = z.string();
export const synsetIdSchema = z.string();
export const syntacticBehaviorIdSchema = z.string();

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
export const partsOfSpeechSchema = z.union([
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

export const senseRelationRelType = z.union([
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

export const synsetRelationRelType = z.union([
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

export const partsOfSpeechList: string[] = partsOfSpeechSchema.options.map((
  v,
) => v.value);

export const pronunciationSchema = z.object({
  variety: z.string().optional(), // TODO: "GB", "US", ...
  inner: z.string(), // That's the actual pronunciation value
});

export const lemmaSchema = z.object({
  writtenForm: z.string(), // This is where huge variety lives
  partOfSpeech: partsOfSpeechSchema,
  pronunciations: z.array(pronunciationSchema), // TODO: amounts
});

export const senseRelationSchema = z.object({
  relType: senseRelationRelType,
  dcType: z.string().optional(), // TODO: This is only when relType is "other"
  target: z.string(), // TODO
});

export const adjPositionSchema = z.union([
  z.literal("a"),
  z.literal("p"),
  z.literal("ip"),
]);

export const senseSchema = z.object({
  id: idSchema,
  synset: synsetIdSchema,
  subCat: syntacticBehaviorIdSchema.optional(),
  adjPosition: adjPositionSchema.optional(),
  senseRelations: z.array(senseRelationSchema), // TODO amounts
});

export const formSchema = z.object({
  writtenForm: z.string(), // This is where huge variety lives
});

export const lexicalEntrySchema = z.object({
  id: idSchema,
  lemmas: z.array(lemmaSchema), // TODO amounts
  senses: z.array(senseSchema), // TODO amounts
  forms: z.array(formSchema), // TODO amounts
});

export const definitionSchema = z.object({
  inner: z.string(), // That's the actual pronunciation value
});

export const exampleSchema = z.object({
  inner: z.string(), // That's the actual pronunciation value
});

export const iliDefinitionSchema = z.object({
  inner: z.string(), // That's the actual pronunciation value
});

export const synsetRelationSchema = z.object({
  relType: synsetRelationRelType,
  target: z.string(), // TODO
});

export const synsetSchema = z.object({
  id: idSchema,
  ili: z.string(),
  members: z.string(), // space-separated list
  partOfSpeech: partsOfSpeechSchema,
  lexfile: z.string(),
  definitions: z.array(definitionSchema), // TODO amounts. Only one?
  examples: z.array(exampleSchema), // TODO amounts. Many?
  iliDefinitions: z.array(iliDefinitionSchema), // TODO amounts. Only one?
  synsetRelations: z.array(synsetRelationSchema), // TODO amounts. Many?
});

export const syntacticBehaviorSchema = z.object({
  id: syntacticBehaviorIdSchema,
  subcategorizationFrame: z.string(), // This is where huge variety lives
});

export const lexiconSchema = z.object({
  id: idSchema, // "oewn"
  label: z.string(), // "Open English WordNet"
  language: z.string(), // "en"
  email: z.string(), // "english-wordnet@googlegroups.com"
  license: z.string(), // "https://creativecommons.org/licenses/by/4.0/"
  version: z.string(), // "2023"
  citation: z.string(), // "John P. McCrae, Alexandre Rademaker, Francis Bond, Ewa Rudnicka and Christiane Fellbaum (2019) English WordNet 2019 – An Open-Source WordNet for English, *Proceedings of the 10th Global WordNet Conference* – GWC 2019"
  url: z.string(), // "https://github.com/globalwordnet/english-wordnet">
  lexicalEntries: z.array(lexicalEntrySchema), // TODO: amount
  synsets: z.array(synsetSchema), // TODO: amount
  syntacticBehaviors: z.array(syntacticBehaviorSchema), // TODO: amount
});

export type Lemma = z.infer<typeof lemmaSchema>;
export type LexicalEntry = z.infer<typeof lexicalEntrySchema>;
export type Sense = z.infer<typeof senseSchema>;
export type SenseRelation = z.infer<typeof senseRelationSchema>;
export type Pronunciation = z.infer<typeof pronunciationSchema>;
export type Form = z.infer<typeof formSchema>;
export type Synset = z.infer<typeof synsetSchema>;
export type Definition = z.infer<typeof definitionSchema>;
export type Example = z.infer<typeof exampleSchema>;
export type ILIDefinition = z.infer<typeof iliDefinitionSchema>;
export type SynsetRelation = z.infer<typeof synsetRelationSchema>;
export type SyntacticBehavior = z.infer<typeof syntacticBehaviorSchema>;
export type Lexicon = z.infer<typeof lexiconSchema>;
