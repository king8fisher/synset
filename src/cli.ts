#!/usr/bin/env node
import { exportToSQLite } from "./export-sqlite";
import { decodeXmlEntities } from "./helpers";
import { PartsOfSpeech, SynsetRelationRelType } from "./literals";
import { ensureWordNetCached, fetchWordNet, loadWordNet } from "./loader";
import {
  buildIndex,
  findSynsets,
  getDefinitions,
  getHypernyms,
  getHyponyms,
  getSynonyms,
  getSynsetWords,
} from "./query";

/** Decode XML entities, return empty string if undefined */
const decode = (s: string | undefined): string => decodeXmlEntities(s) ?? "";

const HELP = `
synset - WordNet dictionary explorer

Usage:
  synset <command> [options]

Commands:
  define <word>       Show definitions for a word
  synonyms <word>     List synonyms for a word
  hypernyms <word>    Show hypernyms (more general terms)
  hyponyms <word>     Show hyponyms (more specific terms)
  related <word>      Show all relations for a word
  info <synset-id>    Show details for a synset ID
  fetch               Download WordNet data to cache
  export-sqlite <out> Export dictionary to SQLite database

Options:
  --file <path>       Use a local WordNet XML file instead of cache
  --overwrite         Overwrite existing file (for export-sqlite)
  --help, -h          Show this help message

Examples:
  synset define dog
  synset synonyms happy
  synset related computer --file ./wordnet.xml
  synset fetch
  synset export-sqlite dictionary.db
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];
  const fileIndex = args.indexOf("--file");
  const filePath = fileIndex !== -1 ? args[fileIndex + 1] : undefined;

  // Remove --file and its argument from args for word extraction
  const cleanArgs =
    fileIndex === -1
      ? args
      : args.filter((_, i) => i !== fileIndex && i !== fileIndex + 1);
  const word = cleanArgs[1];

  if (command === "fetch") {
    console.log("Downloading WordNet data...");
    const { filePath: cachedPath, version } = await ensureWordNetCached({
      forceDownload: args.includes("--force"),
      onProgress: console.log,
    });
    console.log(`WordNet ${version} cached at: ${cachedPath}`);
    return;
  }

  if (command === "export-sqlite") {
    const outputPath = cleanArgs[1];
    if (!outputPath) {
      console.error("Error: Missing output path for export-sqlite");
      process.exit(1);
    }
    const overwrite = args.includes("--overwrite");
    console.log("Loading WordNet data...");
    const lexicon = filePath
      ? await loadWordNet(filePath)
      : (await fetchWordNet({ onProgress: console.log })).lexicon;
    console.log(`Exporting to ${outputPath}...`);
    exportToSQLite(lexicon, outputPath, {
      overwrite,
      onProgress: ({ phase, current, total }) => {
        process.stdout.write(`\r${phase}: ${current}/${total}`);
      },
    });
    console.log(`\nExported to ${outputPath}`);
    return;
  }

  if (!word && command !== "fetch") {
    console.error(`Error: Missing word argument for command '${command}'`);
    process.exit(1);
  }

  const lexicon = filePath
    ? await loadWordNet(filePath)
    : (await fetchWordNet({ onProgress: console.log })).lexicon;

  const index = buildIndex(lexicon);

  switch (command) {
    case "define": {
      const definitions = getDefinitions(index, word);
      if (definitions.length === 0) {
        console.log(`No definitions found for "${word}"`);
      } else {
        console.log(`Definitions for "${word}":`);
        definitions.forEach((def, i) => {
          const pos = PartsOfSpeech[def.partOfSpeech] || def.partOfSpeech;
          console.log(`  ${i + 1}. [${pos}] ${decode(def.text)}`);
        });
      }
      break;
    }

    case "synonyms": {
      const synonyms = getSynonyms(index, word);
      if (synonyms.length === 0) {
        console.log(`No synonyms found for "${word}"`);
      } else {
        console.log(`Synonyms for "${word}":`);
        console.log(`  ${synonyms.map((s) => s.word).join(", ")}`);
      }
      break;
    }

    case "hypernyms": {
      const hypernyms = getHypernyms(index, word);
      if (hypernyms.length === 0) {
        console.log(`No hypernyms found for "${word}"`);
      } else {
        console.log(`Hypernyms for "${word}" (more general):`);
        hypernyms.forEach((s) => {
          const words = getSynsetWords(index, s);
          const def = decode(s.definitions[0]?.inner);
          console.log(`  - ${words.join(", ")}: ${def}`);
        });
      }
      break;
    }

    case "hyponyms": {
      const hyponyms = getHyponyms(index, word);
      if (hyponyms.length === 0) {
        console.log(`No hyponyms found for "${word}"`);
      } else {
        console.log(`Hyponyms for "${word}" (more specific):`);
        hyponyms.forEach((s) => {
          const words = getSynsetWords(index, s);
          const def = decode(s.definitions[0]?.inner);
          console.log(`  - ${words.join(", ")}: ${def}`);
        });
      }
      break;
    }

    case "related": {
      const synsets = findSynsets(index, word);
      if (synsets.length === 0) {
        console.log(`No synsets found for "${word}"`);
        break;
      }

      console.log(`Relations for "${word}":`);
      for (const synset of synsets) {
        const pos = PartsOfSpeech[synset.partOfSpeech] || synset.partOfSpeech;
        const def = decode(synset.definitions[0]?.inner);
        console.log(`\n[${pos}] ${def}`);

        // Group relations by type
        const relsByType = new Map<string, string[]>();
        for (const rel of synset.synsetRelations) {
          const relatedSynset = index.synsets.get(rel.target);
          if (relatedSynset) {
            const words = getSynsetWords(index, relatedSynset);
            const existing = relsByType.get(rel.relType) || [];
            existing.push(words.join(", "));
            relsByType.set(rel.relType, existing);
          }
        }

        for (const [relType, words] of relsByType) {
          const label = SynsetRelationRelType[relType] || relType;
          console.log(`  ${label}:`);
          for (const w of words) console.log(`    - ${w}`);
        }
      }
      break;
    }

    case "info": {
      // word here is actually the synset ID
      const synset = index.synsets.get(word);
      if (!synset) {
        console.log(`Synset not found: ${word}`);
        break;
      }

      const pos = PartsOfSpeech[synset.partOfSpeech] || synset.partOfSpeech;
      const words = getSynsetWords(index, synset);

      console.log(`Synset: ${synset.id}`);
      console.log(`Words: ${words.join(", ")}`);
      console.log(`Part of Speech: ${pos}`);
      console.log(`ILI: ${synset.ili}`);
      console.log(`\nDefinitions:`);
      for (const d of synset.definitions) console.log(`  - ${decode(d.inner)}`);

      if (synset.examples.length > 0) {
        console.log(`\nExamples:`);
        for (const e of synset.examples)
          console.log(`  - "${decode(e.inner)}"`);
      }

      if (synset.synsetRelations.length > 0) {
        console.log(`\nRelations:`);
        for (const rel of synset.synsetRelations) {
          const label = SynsetRelationRelType[rel.relType] || rel.relType;
          const relatedSynset = index.synsets.get(rel.target);
          const relatedWords = relatedSynset
            ? getSynsetWords(index, relatedSynset).join(", ")
            : rel.target;
          console.log(`  ${label}: ${relatedWords}`);
        }
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
