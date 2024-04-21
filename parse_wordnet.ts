import { existsSync } from "$std/fs/exists.ts";
import { Node, parse } from "@dbushell/xml-streamify";
import { LexiconNode } from "~/parse_node_helpers.ts";

export const version = "2023";
export const fileName = `english-wordnet-${version}.xml`;
export const localFileName = `./data/${fileName}`;

const testFilePath = async () => {
  const path = await Deno.realPath(localFileName);
  return path;
};

const testFileExists = async () => {
  if (existsSync(localFileName)) {
    const path = await Deno.realPath(localFileName);
    const stat = await Deno.stat(path);
    return stat.isFile;
  }
  return false;
};

const fetchTestFile = async () => {
  const src = await fetch(
    `https://en-word.net/static/${fileName}.gz`,
  );
  const dest = await Deno.open(localFileName, {
    create: true,
    write: true,
  });
  if (src.body == null) return;
  await src.body
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeTo(dest.writable);
};

export const testFileParser = async () => {
  if (!await testFileExists()) {
    console.log("unzipping");
    await fetchTestFile();
  }
  const p = await testFilePath();

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
