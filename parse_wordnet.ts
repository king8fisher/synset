import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { Node, parse } from "@dbushell/xml-streamify";
import { LexiconNode } from "~/parse_node_helpers.ts";

export const version = "2024";
export const fileName = `english-wordnet-${version}.xml`;
export const localFileName = `./data/${fileName}`;

const testFilePath = () => {
  return path.resolve(localFileName);
};

const testFileExists = () => {
  if (existsSync(localFileName)) {
    const p = path.resolve(localFileName);
    const stat = statSync(p);
    return stat.isFile();
  }
  return false;
};

const fetchTestFile = async () => {
  const src = await fetch(`https://en-word.net/static/${fileName}.gz`);
  if (src.body == null) return;
  const decompressed = src.body.pipeThrough(new DecompressionStream("gzip"));
  const response = new Response(decompressed);
  const arrayBuffer = await response.arrayBuffer();
  await Bun.write(localFileName, arrayBuffer);
};

export const testFileParser = async () => {
  if (!testFileExists()) {
    console.log("unzipping");
    await fetchTestFile();
  }
  const p = testFilePath();

  const parser = parse(`file:///${p.replace("\\", "/")}`, {
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
