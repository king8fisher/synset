[![npm version](https://img.shields.io/npm/v/synset.svg)](https://www.npmjs.com/package/synset)

# synset

WordNet dictionary parser with Zod validation, query utilities, and CLI.

## Usage

### CLI

```bash
# Run without installing
bunx synset define dog

# List synonyms
bunx synset synonyms happy

# Show hypernyms (more general terms)
bunx synset hypernyms dog

# Show all relations
bunx synset related computer

# Pre-download WordNet data
bunx synset fetch

# Use local file instead of cache
bunx synset define dog --file ./path/to/english-wordnet-{YEAR}.xml
```

> Or install globally:
> ```bash
> bun install -g synset
> synset define dog
> ```

### Library

```bash
npm install synset
# or
bun add synset
```

```ts
import {
  fetchWordNet,
  loadWordNet,
  buildIndex,
  getDefinitions,
  getSynonyms,
  getHypernyms,
  findSynsets,
} from 'synset'

// Fetch WordNet data (auto-discovers latest version, downloads & caches ~100MB XML)
const { lexicon, version } = await fetchWordNet()
console.log(`Loaded WordNet ${version}`)

// Or load from local file
const lexicon = await loadWordNet('./path/to/english-wordnet-{YEAR}.xml')

// Build index for fast lookups
const index = buildIndex(lexicon)

// Query
getDefinitions(index, 'dog')
// [{ text: "a member of the genus Canis...", synset, partOfSpeech: "n" }, ...]

getSynonyms(index, 'happy')
// [{ word: "glad", entry, synset }, ...]

getHypernyms(index, 'dog')
// [Synset for "canine", Synset for "domestic animal", ...]

findSynsets(index, 'bank')
// [Synset for "financial institution", Synset for "river bank", ...]
```

## Runtime

- **Bun**: Full support (recommended)
- **Node.js 18+**: Full support

## Development

```bash
bun install
bun test
bun run check  # typecheck
bun run build  # build dist/
```

## Dictionary Module

- WordNet
  - Format:
    - https://globalwordnet.github.io/schemas/
      - XML file source:
        - https://github.com/globalwordnet/english-wordnet
          - Latest version auto-discovered and downloaded by tests
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

## TODO

- [ ] Support [Open English Namenet](https://en-word.net/) - proper nouns (people, places, etc.) were moved to a separate resource starting with 2025 release
- [ ] Option to fetch "2025+" edition which includes curated proper nouns from Namenet
- [ ] CLI `--json` flag for JSON output
- [ ] CLI colored output (disable with `--no-color`)
