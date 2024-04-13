import { Node } from "@dbushell/xml-streamify";
import {
  adjPositionSchema,
  Definition,
  definitionSchema,
  Example,
  exampleSchema,
  Form,
  formSchema,
  ILIDefinition,
  iliDefinitionSchema,
  Lemma,
  lemmaSchema,
  LexicalEntry,
  lexicalEntrySchema,
  Lexicon,
  lexiconSchema,
  partsOfSpeechSchema,
  Pronunciation,
  pronunciationSchema,
  Sense,
  SenseRelation,
  senseRelationRelType,
  senseRelationSchema,
  senseSchema,
  Synset,
  synsetIdSchema,
  SynsetRelation,
  synsetRelationRelType,
  synsetRelationSchema,
  synsetSchema,
  SyntacticBehavior,
  syntacticBehaviorSchema,
} from "~/xml_types.ts";

export function PronunciationNode(node: Node): Pronunciation {
  const obj: Pronunciation = {
    variety: attr(node, "variety"),
    inner: node.innerText,
  };
  return pronunciationSchema.parse(obj);
}

export function LemmaNode(node: Node): Lemma {
  const obj: Lemma = {
    writtenForm: attr(node, "writtenForm"),
    partOfSpeech: partsOfSpeechSchema.parse(attr(node, "partOfSpeech")),
    pronunciations: //
      children(node, "Pronunciation", (v) => PronunciationNode(v)),
  };
  return lemmaSchema.parse(obj);
}

export function SenseRelationNode(node: Node): SenseRelation {
  const obj: SenseRelation = {
    relType: senseRelationRelType.parse(attr(node, "relType")),
    target: attr(node, "target"),
    dcType: node.attributes["dc:type"],
  };
  return senseRelationSchema.parse(obj);
}

export function SenseNode(node: Node): Sense {
  const obj: Sense = {
    id: attr(node, "id"),
    synset: synsetIdSchema.parse(attr(node, "synset")),
    senseRelations: children(node, "SenseRelation", SenseRelationNode),
    subCat: attr(node, "subcat"),
    adjPosition: attr(node, "adjposition")
      ? adjPositionSchema.parse(attr(node, "adjposition"))
      : undefined,
  };
  return senseSchema.parse(obj);
}

export function FormNode(node: Node): Form {
  const obj: Form = {
    writtenForm: attr(node, "writtenForm"),
  };
  return formSchema.parse(obj);
}

export function LexicalEntryNode(node: Node): LexicalEntry {
  const obj: LexicalEntry = {
    id: attr(node, "id"),
    lemmas: children(node, "Lemma", LemmaNode),
    senses: children(node, "Sense", SenseNode),
    forms: children(node, "Form", FormNode),
  };
  return lexicalEntrySchema.parse(obj);
}

export function DefinitionNode(node: Node): Definition {
  const obj: Definition = {
    inner: node.innerText,
  };
  return definitionSchema.parse(obj);
}

export function ExampleNode(node: Node): Example {
  const obj: Example = {
    inner: node.innerText,
  };
  return exampleSchema.parse(obj);
}

export function ILIDefinitionNode(node: Node): ILIDefinition {
  const obj: ILIDefinition = {
    inner: node.innerText,
  };
  return iliDefinitionSchema.parse(obj);
}

export function SynsetRelationNode(node: Node): SynsetRelation {
  const obj: SynsetRelation = {
    relType: synsetRelationRelType.parse(attr(node, "relType")),
    target: attr(node, "target"),
  };
  return synsetRelationSchema.parse(obj);
}

export function SyntacticBehaviorNode(node: Node): SyntacticBehavior {
  const obj: SyntacticBehavior = {
    id: attr(node, "id"),
    subcategorizationFrame: attr(node, "subcategorizationFrame"),
  };
  return syntacticBehaviorSchema.parse(obj);
}

export function SynsetNode(node: Node): Synset {
  const obj: Synset = {
    id: attr(node, "id"),
    ili: attr(node, "ili"),
    lexfile: attr(node, "lexfile"),
    members: attr(node, "members"),
    partOfSpeech: partsOfSpeechSchema.parse(attr(node, "partOfSpeech")),
    definitions: children(node, "Definition", (v) => DefinitionNode(v)),
    examples: children(node, "Example", (v) => ExampleNode(v)),
    iliDefinitions: children(node, "ILIDefinition", ILIDefinitionNode),
    synsetRelations: children(node, "SynsetRelation", SynsetRelationNode),
  };
  return synsetSchema.parse(obj);
}

export function LexiconNode(node: Node): Lexicon {
  const obj: Lexicon = {
    id: attr(node, "id"),
    label: attr(node, "label"),
    language: attr(node, "language"),
    email: attr(node, "email"),
    license: attr(node, "license"),
    version: attr(node, "version"),
    citation: attr(node, "citation"),
    url: attr(node, "url"),
    lexicalEntries: children(node, "LexicalEntry", LexicalEntryNode),
    synsets: children(node, "Synset", SynsetNode),
    syntacticBehaviors: //
      children(node, "SyntacticBehaviour", SyntacticBehaviorNode),
  };
  return lexiconSchema.parse(obj);
}

const attr = (node: Node, attrName: string) => {
  return node.attributes[attrName];
};

const children = <T, Fn extends (node: Node) => T>(
  node: Node,
  type: string,
  fn: Fn,
) => {
  return node.children.filter((v) => v.type == type)
    .map((v) => fn(v));
};
