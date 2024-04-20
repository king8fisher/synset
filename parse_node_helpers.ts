import { Node } from "@dbushell/xml-streamify";
import {
  AdjPosition,
  Definition,
  Example,
  Form,
  ILIDefinition,
  Lemma,
  LexicalEntry,
  Lexicon,
  PartsOfSpeech,
  Pronunciation,
  Sense,
  SenseRelation,
  SenseRelationRelType,
  Synset,
  SynsetId,
  SynsetRelation,
  SynsetRelationRelType,
  SyntacticBehavior,
} from "./wordnet_types.ts";

export function PronunciationNode(node: Node): Pronunciation {
  const obj: Pronunciation = {
    variety: attr(node, "variety"),
    inner: node.innerText,
  };
  return Pronunciation.parse(obj);
}

export function LemmaNode(node: Node): Lemma {
  const obj: Lemma = {
    writtenForm: attr(node, "writtenForm"),
    partOfSpeech: PartsOfSpeech.parse(attr(node, "partOfSpeech")),
    pronunciations: //
      children(node, "Pronunciation", (v) => PronunciationNode(v)),
  };
  return Lemma.parse(obj);
}

export function SenseRelationNode(node: Node): SenseRelation {
  const obj: SenseRelation = {
    relType: SenseRelationRelType.parse(attr(node, "relType")),
    target: attr(node, "target"),
    dcType: node.attributes["dc:type"],
  };
  return SenseRelation.parse(obj);
}

export function SenseNode(node: Node): Sense {
  const obj: Sense = {
    id: attr(node, "id"),
    synset: SynsetId.parse(attr(node, "synset")),
    senseRelations: children(node, "SenseRelation", SenseRelationNode),
    subCat: attr(node, "subcat"),
    adjPosition: attr(node, "adjposition")
      ? AdjPosition.parse(attr(node, "adjposition"))
      : undefined,
  };
  return Sense.parse(obj);
}

export function FormNode(node: Node): Form {
  const obj: Form = {
    writtenForm: attr(node, "writtenForm"),
  };
  return Form.parse(obj);
}

export function LexicalEntryNode(node: Node): LexicalEntry {
  const obj: LexicalEntry = {
    id: attr(node, "id"),
    lemmas: children(node, "Lemma", LemmaNode),
    senses: children(node, "Sense", SenseNode),
    forms: children(node, "Form", FormNode),
  };
  return LexicalEntry.parse(obj);
}

export function DefinitionNode(node: Node): Definition {
  const obj: Definition = {
    inner: node.innerText,
  };
  return Definition.parse(obj);
}

export function ExampleNode(node: Node): Example {
  const obj: Example = {
    inner: node.innerText,
  };
  return Example.parse(obj);
}

export function ILIDefinitionNode(node: Node): ILIDefinition {
  const obj: ILIDefinition = {
    inner: node.innerText,
  };
  return ILIDefinition.parse(obj);
}

export function SynsetRelationNode(node: Node): SynsetRelation {
  const obj: SynsetRelation = {
    relType: SynsetRelationRelType.parse(attr(node, "relType")),
    target: attr(node, "target"),
  };
  return SynsetRelation.parse(obj);
}

export function SyntacticBehaviorNode(node: Node): SyntacticBehavior {
  const obj: SyntacticBehavior = {
    id: attr(node, "id"),
    subcategorizationFrame: attr(node, "subcategorizationFrame"),
  };
  return SyntacticBehavior.parse(obj);
}

export function SynsetNode(node: Node): Synset {
  const obj: Synset = {
    id: attr(node, "id"),
    ili: attr(node, "ili"),
    lexfile: attr(node, "lexfile"),
    members: attr(node, "members"),
    partOfSpeech: PartsOfSpeech.parse(attr(node, "partOfSpeech")),
    definitions: children(node, "Definition", (v) => DefinitionNode(v)),
    examples: children(node, "Example", (v) => ExampleNode(v)),
    iliDefinitions: children(node, "ILIDefinition", ILIDefinitionNode),
    synsetRelations: children(node, "SynsetRelation", SynsetRelationNode),
  };
  return Synset.parse(obj);
}

/** LexiconNode is used as a root node for the whole WordNet document structure,
 * omitting the `LexicalResource` parent (and its virtual grandparent representing the
 * whole document). */
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
  return Lexicon.parse(obj);
}

const attr = (node: Node, attrName: string) => {
  return node.attributes[attrName];
};

const children = <T, Fn extends (node: Node) => T>(
  node: Node,
  type: string,
  fn: Fn,
) => {
  return node.children
    .filter((v: Node) => v.type == type)
    .map((v: Node) => fn(v));
};
