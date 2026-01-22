import { readdirSync } from "node:fs";
import path from "node:path";
import { Node, parse } from "@dbushell/xml-streamify";
import { LexiconNode } from "~/parse_node_helpers.ts";

/** Find the WordNet file in data/ (downloaded by test-preload.ts) */
function findDataFile(): { filePath: string; version: string } {
  const files = readdirSync("./data");
  const match = files.find((f) => f.match(/english-wordnet-\d{4}\.xml/));
  if (!match) {
    throw new Error("No WordNet data file found in ./data/ - run tests with preload");
  }
  const version = match.match(/(\d{4})/)?.[1] || "unknown";
  return { filePath: path.resolve("./data", match), version };
}

const dataFile = findDataFile();
export const version = dataFile.version;
export const localFileName = dataFile.filePath;

export const testFileParser = async () => {
  const p = localFileName;
  const fileUrl = p.startsWith("/") ? `file://${p}` : `file:///${p.replace(/\\/g, "/")}`;
  const parser = parse(fileUrl, {
    ignoreDeclaration: false,
    silent: false,
  });
  return parser;
};

export const parseLexicon = async (
  parser: AsyncGenerator<Node, void | Node, void>,
) => {
  for await (const node of parser) {
    if (node.type == "Lexicon") {
      return LexiconNode(node);
    }
  }
  return undefined;
};
