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
    variety: node.attributes["variety"],
    inner: node.innerText,
  };
  return pronunciationSchema.parse(obj);
}

export function LemmaNode(node: Node): Lemma {
  const obj: Lemma = {
    writtenForm: node.attributes["writtenForm"],
    partOfSpeech: partsOfSpeechSchema.parse(node.attributes["partOfSpeech"]),
    pronunciations: node.children.filter((v) => v.type == "Pronunciation")
      .map(
        (v) => {
          return PronunciationNode(v);
        },
      ),
  };
  return lemmaSchema.parse(obj);
}

export function SenseRelationNode(node: Node): SenseRelation {
  const obj: SenseRelation = {
    relType: senseRelationRelType.parse(node.attributes["relType"]),
    target: node.attributes["target"],
    dcType: node.attributes["dc:type"],
  };
  return senseRelationSchema.parse(obj);
}

export function SenseNode(node: Node): Sense {
  const obj: Sense = {
    id: node.attributes["id"],
    synset: synsetIdSchema.parse(node.attributes["synset"]),
    senseRelations: node.children.filter((v) => v.type == "SenseRelation").map(
      (v) => {
        return SenseRelationNode(v);
      },
    ),
    subCat: node.attributes["subcat"],
    adjPosition: node.attributes["adjposition"]
      ? adjPositionSchema.parse(node.attributes["adjposition"])
      : undefined,
  };
  return senseSchema.parse(obj);
}

export function FormNode(node: Node): Form {
  const obj: Form = {
    writtenForm: node.attributes["writtenForm"],
  };
  return formSchema.parse(obj);
}

export function LexicalEntryNode(node: Node): LexicalEntry {
  const obj: LexicalEntry = {
    id: node.attributes["id"],
    lemmas: node.children.filter((v) => v.type == "Lemma").map((v) => {
      return LemmaNode(v);
    }),
    senses: node.children.filter((v) => v.type == "Sense").map((v) => {
      return SenseNode(v);
    }),
    forms: node.children.filter((v) => v.type == "Form").map((v) => {
      return FormNode(v);
    }),
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
    relType: synsetRelationRelType.parse(node.attributes["relType"]),
    target: node.attributes["target"],
  };
  return synsetRelationSchema.parse(obj);
}

export function SyntacticBehaviorNode(node: Node): SyntacticBehavior {
  const obj: SyntacticBehavior = {
    id: node.attributes["id"],
    subcategorizationFrame: node.attributes["subcategorizationFrame"],
  };
  return syntacticBehaviorSchema.parse(obj);
}

export function SynsetNode(node: Node): Synset {
  const obj: Synset = {
    id: node.attributes["id"],
    ili: node.attributes["ili"],
    lexfile: node.attributes["lexfile"],
    members: node.attributes["members"],
    partOfSpeech: partsOfSpeechSchema.parse(node.attributes["partOfSpeech"]),
    definitions: node.children.filter((v) => v.type == "Definition").map(
      (v) => DefinitionNode(v),
    ),
    examples: node.children.filter((v) => v.type == "Example").map(
      (v) => ExampleNode(v),
    ),
    iliDefinitions: node.children.filter((v) => v.type == "ILIDefinition").map(
      (v) => ILIDefinitionNode(v),
    ),
    synsetRelations: node.children.filter((v) => v.type == "SynsetRelation")
      .map(
        (v) => SynsetRelationNode(v),
      ),
  };
  return synsetSchema.parse(obj);
}

export function LexiconNode(node: Node): Lexicon {
  const obj: Lexicon = {
    id: node.attributes["id"],
    label: node.attributes["label"],
    language: node.attributes["language"],
    email: node.attributes["email"],
    license: node.attributes["license"],
    version: node.attributes["version"],
    citation: node.attributes["citation"],
    url: node.attributes["url"],
    lexicalEntries: node.children.filter((v) => v.type == "LexicalEntry").map(
      (v) => LexicalEntryNode(v),
    ),
    synsets: node.children.filter((v) => v.type == "Synset").map(
      (v) => SynsetNode(v),
    ),
    syntacticBehaviors: node.children.filter((v) =>
      v.type == "SyntacticBehaviour"
    ).map(
      (v) => SyntacticBehaviorNode(v),
    ),
  };
  return lexiconSchema.parse(obj);
}
