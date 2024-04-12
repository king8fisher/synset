export type ID = string;

export type LexicalEntry = {
  id: ID;
  lemmas: Lemma[];
};

export type PartsOfSpeech = "a" | "n" | "s" | "v" | "r";
export const partsOfSpeechList = ["a", "n", "s", "v", "r"];

export type Lemma = {
  writtenForm: string;
  partOfSpeech: PartsOfSpeech;
};
