/**
 * Bun test preload script - downloads WordNet data before tests run
 */
import { ensureWordNetCached } from "./loader";

const { filePath, version } = await ensureWordNetCached({
  cacheDir: "./data",
  onProgress: console.log,
});

console.log(`Test data ready: WordNet ${version} at ${filePath}`);
