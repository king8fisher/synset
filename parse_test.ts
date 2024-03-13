import { assertEquals } from "https://deno.land/std@0.219.0/assert/mod.ts";
import { existsSync } from "https://deno.land/std@0.219.0/fs/exists.ts";
import { parse } from "@dbushell/xml-streamify";

const fileName = "english-wordnet-2023.xml";
const localFileName = `./data/${fileName}`;

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

Deno.test("quotes", async () => {
  if (!await testFileExists()) {
    console.log("unzipping");
    await fetchTestFile();
  }

  const p = await testFilePath();

  const parser = parse(`file:///${p.replace("\\", "/")}`, {
    ignoreDeclaration: false,
    silent: false,
  });

  const expect = [
    { lemma: "tailor", count: 2 }, // "v" and "n"
    { lemma: "guard", count: 2 }, // "v" and "n"
    { lemma: "tailor's tack", count: 1 },
    { lemma: "Aladdin", count: 1 },
    { lemma: "Aladdin's lamp", count: 1 },
  ];
  const found: Map<string, number> = new Map();

  let count = 0;

  for await (const node of parser) {
    if (node.type == "Lemma") {
      const writtenForm = node.attributes["writtenForm"];

      expect.forEach((v) => {
        if (writtenForm == v.lemma) {
          found.set(v.lemma, (found.get(v.lemma) || 0) + 1);
          console.log(node.raw);
        }
      });
      count++;
    }
  }

  for (const e of expect) {
    const f = found.get(e.lemma) || 0;
    assertEquals(
      f,
      e.count,
      `should be ${e.count} of "${e.lemma}" lemmas, found ${f} instead`,
    );
  }
  console.log(`${count} lemmas processed`);
});

// function measureExecutionTime<T extends (...args: unknown[]) => any>(
//   func: T,
// ): (...args: Parameters<T>) => { result: ReturnType<T>; time: number } {
//   return (...args: Parameters<T>): { result: ReturnType<T>; time: number } => {
//     const start = performance.now();
//     const result = func(...args);
//     const end = performance.now();
//     const time = end - start;
//     return { result, time };
//   };
// }
