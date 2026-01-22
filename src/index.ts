// Types and schemas
export {
  // Zod schemas for validation
  Lexicon,
  LexicalEntry,
  Lemma,
  Sense,
  SenseRelation,
  Synset,
  SynsetRelation,
  Definition,
  Example,
  Form,
  Pronunciation,
  ILIDefinition,
  SyntacticBehavior,
  // ID schemas
  LexiconId,
  LexicalEntryId,
  SynsetId,
  SenseId,
  SyntacticBehaviorId,
  // Enum schemas
  PartsOfSpeech,
  SenseRelationRelType,
  SynsetRelationRelType,
  AdjPosition,
  // Utility
  partsOfSpeechList,
} from "./types";

// Re-export types (inferred from Zod schemas)
export type {
  Lexicon as LexiconType,
  LexicalEntry as LexicalEntryType,
  Lemma as LemmaType,
  Sense as SenseType,
  SenseRelation as SenseRelationType,
  Synset as SynsetType,
  SynsetRelation as SynsetRelationObjectType,
  Definition as DefinitionType,
  Example as ExampleType,
  Form as FormType,
  Pronunciation as PronunciationType,
  ILIDefinition as ILIDefinitionType,
  SyntacticBehavior as SyntacticBehaviorType,
} from "./types";

// Literals (human-readable labels)
export {
  PartsOfSpeech as PartsOfSpeechLabels,
  SenseRelationRelType as SenseRelationLabels,
  SynsetRelationRelType as SynsetRelationLabels,
  AdjPosition as AdjPositionLabels,
} from "./literals";

// Data loading
export {
  loadWordNet,
  fetchWordNet,
  ensureWordNetCached,
  findLatestVersion,
  createParser,
  parseLexicon,
  getFilename,
  getDownloadUrl,
  getDefaultCacheDir,
  // Version constants
  BASE_VERSION,
  WORDNET_VERSION, // legacy alias for BASE_VERSION
  WORDNET_FILENAME, // legacy
  WORDNET_URL, // legacy
} from "./loader";
export type { LoadOptions, LoadResult } from "./loader";

// Query utilities
export {
  buildIndex,
  getSynset,
  getSense,
  getLexicalEntry,
  findWord,
  findSenses,
  findSynsets,
  getDefinitions,
  getRelated,
  getHypernyms,
  getHyponyms,
  getSynonyms,
  getSynsetWords,
} from "./query";
export type { WordNetIndex, DefinitionResult, SynonymResult } from "./query";

// Low-level XML helpers (for advanced usage)
export { decodeXmlEntities, LexiconNode } from "./helpers";
