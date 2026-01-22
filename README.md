# Dictionary Data Processor

## Setup

```bash
bun install
bun test
bun run check  # typecheck
```

## Dictionary Module

- WordNet
  - Format:
    - https://globalwordnet.github.io/schemas/
      - XML file source:
        - https://github.com/globalwordnet/english-wordnet
          - Current release: 2024. Downloaded by the test:
            - `english-wordnet-2024.xml`
        - XML format:
          [DTD](https://globalwordnet.github.io/schemas/WN-LMF-1.3.dtd)
          - Manually copied over to
            - `WN-LMF-1.3.dtd`

### WordNet XML Source Structure

(Originally created with `xmlstarlet` against the 2023 xml file).

`$ xmlstarlet el data/english-wordnet-2023.xml | sort | uniq | sort`
(with unicode symbols added manually)

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

### Schema Verification

Stats accumulated with:
* `$ xmlstarlet el data/english-wordnet-2023.xml | sort | uniq -c | sort -n`
* `$ grep -oE '<[A-Za-z]+' data/english-wordnet-2024.xml | sed 's/<//g' | sort | uniq -c | sort -n`

Element counts comparison (schema unchanged between releases):

| Element            |   2023 |   2024 |
| ------------------ | -----: | -----: |
| LexicalResource    |      1 |      1 |
| Lexicon            |      1 |      1 |
| SyntacticBehaviour |     39 |     39 |
| ILIDefinition      |   2700 |   3216 |
| Form               |   4474 |   4474 |
| Pronunciation      |  44671 |  44669 |
| Example            |  49638 |  49723 |
| Synset             | 120135 | 120630 |
| Definition         | 120141 | 120635 |
| SenseRelation      | 122041 | 122018 |
| LexicalEntry       | 161338 | 161705 |
| Lemma              | 161338 | 161705 |
| Sense              | 212071 | 212478 |
| SynsetRelation     | 293864 | 297150 |

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
