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
  return Pronunciation.parse(extendWithRestAttr(node, obj, (s) => s));
}

export function LemmaNode(node: Node): Lemma {
  const obj: Lemma = {
    writtenForm: attr(node, "writtenForm"),
    partOfSpeech: PartsOfSpeech.parse(attr(node, "partOfSpeech")),
    pronunciations: //
      children(node, "Pronunciation", (v) => PronunciationNode(v)),
  };
  return Lemma.parse(extendWithRestAttr(node, obj, (s) => s));
}

export function SenseRelationNode(node: Node): SenseRelation {
  const obj: SenseRelation = {
    relType: SenseRelationRelType.parse(attr(node, "relType")),
    target: attr(node, "target"),
    dcType: attr(node, "dc:type"),
  };
  return SenseRelation.parse(
    extendWithRestAttr(node, obj, (s) => s == "dc:type" ? "dcType" : s),
  );
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
  return Sense.parse(
    extendWithRestAttr(
      node,
      obj,
      (s) => s == "subcat" ? "subCat" : s == "adjposition" ? "adjPosition" : s,
    ),
  );
}

export function FormNode(node: Node): Form {
  const obj: Form = {
    writtenForm: attr(node, "writtenForm"),
  };
  return Form.parse(extendWithRestAttr(node, obj, (s) => s));
}

export function LexicalEntryNode(node: Node): LexicalEntry {
  const obj: LexicalEntry = {
    id: attr(node, "id"),
    lemmas: children(node, "Lemma", LemmaNode),
    senses: children(node, "Sense", SenseNode),
    forms: children(node, "Form", FormNode),
  };
  return LexicalEntry.parse(extendWithRestAttr(node, obj, (s) => s));
}

export function DefinitionNode(node: Node): Definition {
  const obj: Definition = {
    inner: node.innerText,
  };
  return Definition.parse(extendWithRestAttr(node, obj, (s) => s));
}

export function ExampleNode(node: Node): Example {
  const obj: Example = {
    inner: node.innerText,
    dcSource: attr(node, "dc:source"),
  };
  return Example.parse(
    extendWithRestAttr(node, obj, (s) => s == "dc:source" ? "dcSource" : s),
  );
}

export function ILIDefinitionNode(node: Node): ILIDefinition {
  const obj: ILIDefinition = {
    inner: node.innerText,
  };
  return ILIDefinition.parse(extendWithRestAttr(node, obj, (s) => s));
}

export function SynsetRelationNode(node: Node): SynsetRelation {
  const obj: SynsetRelation = {
    relType: SynsetRelationRelType.parse(attr(node, "relType")),
    target: attr(node, "target"),
  };
  return SynsetRelation.parse(extendWithRestAttr(node, obj, (s) => s));
}

export function SyntacticBehaviorNode(node: Node): SyntacticBehavior {
  const obj: SyntacticBehavior = {
    id: attr(node, "id"),
    subcategorizationFrame: attr(node, "subcategorizationFrame"),
  };
  return SyntacticBehavior.parse(extendWithRestAttr(node, obj, (s) => s));
}

export function SynsetNode(node: Node): Synset {
  const obj: Synset = {
    id: attr(node, "id"),
    ili: attr(node, "ili"),
    lexfile: attr(node, "lexfile"),
    members: attr(node, "members").split(" "),
    dcSource: attr(node, "dc:source"),
    partOfSpeech: PartsOfSpeech.parse(attr(node, "partOfSpeech")),
    definitions: children(node, "Definition", (v) => DefinitionNode(v)),
    examples: children(node, "Example", (v) => ExampleNode(v)),
    iliDefinitions: children(node, "ILIDefinition", ILIDefinitionNode),
    synsetRelations: children(node, "SynsetRelation", SynsetRelationNode),
  };
  return Synset.parse(
    extendWithRestAttr(node, obj, (s) => s == "dc:source" ? "dcSource" : s),
  );
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
  return Lexicon.parse(extendWithRestAttr(node, obj, (s) => s));
}

const attr = (node: Node, attrName: string) => {
  return node.attributes[attrName];
};

/** restAttrs appends the rest of the attributes, taking into account that some has been renamed.
 * The proxy function provided is expected to return the renamed result for an original xml key.
 */
const restAttrs = (
  node: Node,
  obj: object,
  proxy: (from: string) => string,
): Record<string, string> => {
  const result: Record<string, string> = {};
  Object.keys(node.attributes) // These keys are still unmodified
    .filter((a) => !(proxy(a) in obj)) // Here we can't trust the 'in' because obj already has modified keys.
    .forEach(
      (k) => {
        result[k] = node.attributes[k];
      },
    );
  return result;
};

const extendWithRestAttr = (
  node: Node,
  obj: object,
  proxy: (from: string) => string,
) => {
  return Object.assign(obj, restAttrs(node, obj, proxy));
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
