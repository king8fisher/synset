import {
  fetchWordNet,
  buildIndex,
  getDefinitions,
  getSynonyms,
  getHypernyms,
  findSynsets,
} from "synset"

// Fetch WordNet data (auto-discovers latest version, downloads & caches ~100MB XML)
const { lexicon, version } = await fetchWordNet()
console.log(`Loaded WordNet ${version}`)

// Build index for fast lookups
const index = buildIndex(lexicon)

// Query
console.log("\n--- Definitions for 'dog' ---")
const definitions = getDefinitions(index, "dog")
definitions.forEach((d) => console.log(`[${d.partOfSpeech}] ${d.text}`))

console.log("\n--- Synonyms for 'happy' ---")
const synonyms = getSynonyms(index, "happy")
console.log(synonyms.map((s) => s.word).join(", "))

console.log("\n--- Hypernyms for 'dog' ---")
const hypernyms = getHypernyms(index, "dog")
hypernyms.slice(0, 5).forEach((s) => console.log(s.definitions[0]?.inner))

console.log("\n--- Synsets for 'bank' ---")
const synsets = findSynsets(index, "bank")
synsets.forEach((s) => console.log(s.definitions[0]?.inner))
