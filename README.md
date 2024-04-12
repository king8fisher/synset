## Overall Idea

Make a canvas for quickly browsing dictionary definitions, ability to stick
found definitions (or portions of definitions) to the canvas with attributes
like date, comments and links, leading to other pinned definitions. Create
visual markers, highlight elements added long ago, make definitions fade away,
potentially create challenges to make me guess the actual word. Create visual
boundaries that group definitions together.

### Subideas

- count how many times the same word has already been on a canvas, jump to other
  references.
  - (you immediately know that you've already looked up this word in the past)

## Dictionary Module

Dictionary sources need to be transformed into an easy to search and indexed
format, potentially dumped to a Graph Database
(https://neo4j.com/docs/javascript-manual/current/ or similar).

- WordNet
  - Format:
    - https://globalwordnet.github.io/schemas/
      - XML file source:
        - https://github.com/globalwordnet/english-wordnet
          - Current release: 2023. Downloaded by the test:
            - `english-wordnet-2023.xml`
        - XML format:
          [DTD](https://globalwordnet.github.io/schemas/WN-LMF-1.3.dtd)
          - Manually copied over to
            - `WN-LMF-1.3.dtd`

### WordNet XML Source Structure

`$ xmlstarlet el data/english-wordnet-2023.xml | sort | uniq -c | sort -n`

```
     1 LexicalResource
     1 LexicalResource/Lexicon
    39 LexicalResource/Lexicon/SyntacticBehaviour
  2700 LexicalResource/Lexicon/Synset/ILIDefinition
  4474 LexicalResource/Lexicon/LexicalEntry/Form
 44671 LexicalResource/Lexicon/LexicalEntry/Lemma/Pronunciation
 49638 LexicalResource/Lexicon/Synset/Example
120135 LexicalResource/Lexicon/Synset
120141 LexicalResource/Lexicon/Synset/Definition
122041 LexicalResource/Lexicon/LexicalEntry/Sense/SenseRelation
161338 LexicalResource/Lexicon/LexicalEntry
161338 LexicalResource/Lexicon/LexicalEntry/Lemma
212071 LexicalResource/Lexicon/LexicalEntry/Sense
293864 LexicalResource/Lexicon/Synset/SynsetRelation
```

`$ xmlstarlet el data/english-wordnet-2023.xml | sort | uniq | sort` `|`
`(add unicode symbols)`

```
📂 LexicalResource               root node
   📂 Lexicon                    desc of the database: id prefix, language, version, ...
      📂 LexicalEntry            an id for grouping children that can be refed by a Synset.
         📄 Form
         📂 Lemma
            📄 Pronunciation
         📂 Sense
            📄 SenseRelation
      📂 Synset
         📄 Definition
         📄 Example
         📄 ILIDefinition
         📄 SynsetRelation
      📄 SyntacticBehaviour
```

## Zod Test Coverage

```
📂 LexicalResource                  [-] (basic test for a parent)
   📂 Lexicon                       [-] (basic test for a parent)
      📂 LexicalEntry               [x]
         📄 Form                    [x]
         📂 Lemma                   [x]
            📄 Pronunciation        [x]
         📂 Sense                   [x]
            📄 SenseRelation        [x]
      📂 Synset                     [x]
         📄 Definition              [x]
         📄 Example                 [x]
         📄 ILIDefinition           [x]
         📄 SynsetRelation          [x]
      📄 SyntacticBehaviour         [x]
```
