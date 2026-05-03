import { Database } from "bun:sqlite";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import { unlinkSync } from "node:fs";
import { ensureWordNetCached } from "./loader";

setDefaultTimeout(180000);

const CLI_DB_PATH = "./test-cli-out.db";

let cachedXmlPath: string;

beforeAll(async () => {
  const result = await ensureWordNetCached({ cacheDir: "./data" });
  cachedXmlPath = result.filePath;
});

afterAll(() => {
  try {
    unlinkSync(CLI_DB_PATH);
  } catch {
    // ignore
  }
});

async function runCli(extra: string[]): Promise<{
  exitCode: number;
  stderr: string;
}> {
  const proc = Bun.spawn(
    [
      "bun",
      "src/cli.ts",
      "export-sqlite",
      CLI_DB_PATH,
      "--file",
      cachedXmlPath,
      "--overwrite",
      ...extra,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();
  return { exitCode, stderr };
}

describe("export-sqlite CLI", () => {
  test("--tables=words,synsets exports only those tables", async () => {
    const { exitCode } = await runCli(["--tables=words,synsets"]);
    expect(exitCode).toBe(0);

    const db = new Database(CLI_DB_PATH, { readonly: true });
    const wordsCount = (
      db.query("SELECT COUNT(*) AS c FROM words").get() as { c: number }
    ).c;
    const regionsCount = (
      db.query("SELECT COUNT(*) AS c FROM word_regions").get() as { c: number }
    ).c;
    expect(wordsCount).toBeGreaterThan(0);
    expect(regionsCount).toBe(0);
    db.close();
  });

  test("--tables=word_regions without deps exits non-zero with helpful stderr", async () => {
    const { exitCode, stderr } = await runCli(["--tables=word_regions"]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("word_regions");
    expect(stderr).toContain("words");
    expect(stderr).toContain("sense_relations");
  });

  test("--tables=bogus exits non-zero with stderr naming the unknown table", async () => {
    const { exitCode, stderr } = await runCli(["--tables=bogus"]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("bogus");
  });
});
