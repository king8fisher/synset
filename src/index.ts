// Types and schemas

// Low-level XML helpers (for advanced usage)
export { decodeXmlEntities, LexiconNode } from "./helpers";
// Literals (human-readable labels)
export {
  AdjPosition as AdjPositionLabels,
  PartsOfSpeech as PartsOfSpeechLabels,
  SenseRelationRelType as SenseRelationLabels,
  SynsetRelationRelType as SynsetRelationLabels,
} from "./literals";
export type { LoadOptions, LoadResult } from "./loader";

// Data loading
export {
  // Version constants
  BASE_VERSION,
  createParser,
  ensureWordNetCached,
  fetchWordNet,
  findLatestVersion,
  getDefaultCacheDir,
  getDownloadUrl,
  getFilename,
  loadWordNet,
  parseLexicon,
  WORDNET_FILENAME, // legacy
  WORDNET_URL, // legacy
  WORDNET_VERSION, // legacy alias for BASE_VERSION
} from "./loader";
export type { DefinitionResult, SynonymResult, WordNetIndex } from "./query";

// Query utilities
export {
  buildIndex,
  findSenses,
  findSynsets,
  findWord,
  getDefinitions,
  getHypernyms,
  getHyponyms,
  getLexicalEntry,
  getRelated,
  getSense,
  getSynonyms,
  getSynset,
  getSynsetWords,
} from "./query";
// Re-export types (inferred from Zod schemas)
export type {
  Definition as DefinitionType,
  Example as ExampleType,
  Form as FormType,
  ILIDefinition as ILIDefinitionType,
  Lemma as LemmaType,
  LexicalEntry as LexicalEntryType,
  Lexicon as LexiconType,
  Pronunciation as PronunciationType,
  Sense as SenseType,
  SenseRelation as SenseRelationType,
  Synset as SynsetType,
  SynsetRelation as SynsetRelationObjectType,
  SyntacticBehavior as SyntacticBehaviorType,
} from "./types";
export {
  AdjPosition,
  Definition,
  Example,
  Form,
  ILIDefinition,
  Lemma,
  LexicalEntry,
  LexicalEntryId,
  // Zod schemas for validation
  Lexicon,
  // ID schemas
  LexiconId,
  // Enum schemas
  PartsOfSpeech,
  Pronunciation,
  // Utility
  partsOfSpeechList,
  Sense,
  SenseId,
  SenseRelation,
  SenseRelationRelType,
  Synset,
  SynsetId,
  SynsetRelation,
  SynsetRelationRelType,
  SyntacticBehavior,
  SyntacticBehaviorId,
} from "./types";
