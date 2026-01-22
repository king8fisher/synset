import { existsSync, statSync, writeFileSync, mkdirSync, readdirSync, createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { parse, Node } from "@dbushell/xml-streamify";
import { LexiconNode } from "./helpers";
import type { Lexicon } from "./types";

/** Base version to start searching from */
export const BASE_VERSION = "2024";

/** Generate filename for a given version */
export function getFilename(version: string): string {
  return `english-wordnet-${version}.xml`;
}

/** Generate download URL for a given version */
export function getDownloadUrl(version: string): string {
  return `https://en-word.net/static/${getFilename(version)}.gz`;
}

/** Default cache directory for downloaded WordNet data */
export function getDefaultCacheDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || ".";
  return path.join(homeDir, ".cache", "synset");
}

/** Check if file exists and is a file */
function fileExists(filePath: string): boolean {
  if (existsSync(filePath)) {
    const stat = statSync(filePath);
    return stat.isFile();
  }
  return false;
}

/** Check if a remote URL exists (HEAD request) */
async function urlExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

/** Extract version year from filename (e.g., "english-wordnet-2024.xml" -> 2024) */
function extractVersionFromFilename(filename: string): number | null {
  const match = filename.match(/english-wordnet-(\d{4})\.xml/);
  return match ? parseInt(match[1], 10) : null;
}

/** Find any cached WordNet file and return its version */
function findCachedVersion(cacheDir: string): string | null {
  if (!existsSync(cacheDir)) return null;

  const files = readdirSync(cacheDir);
  const wordnetFiles = files
    .map((f) => ({ file: f, year: extractVersionFromFilename(f) }))
    .filter((x): x is { file: string; year: number } => x.year !== null)
    .sort((a, b) => b.year - a.year); // newest first

  return wordnetFiles.length > 0 ? wordnetFiles[0].year.toString() : null;
}

/**
 * Find the best available WordNet version.
 * - WordNet releases come out at END of year, so we only check up to (currentYear - 1)
 * - If cached version exists and no newer year has passed, use cache (no network)
 * - If a new year has passed since cache, check for that year's release
 * - If no cache, discover latest available
 */
export async function findLatestVersion(
  onProgress?: (message: string) => void,
  cacheDir?: string
): Promise<string> {
  const log = onProgress || (() => {});
  const currentYear = new Date().getFullYear();
  const lastReleasableYear = currentYear - 1; // Can't have 2026 release until end of 2026
  const baseYear = parseInt(BASE_VERSION, 10);
  const dir = cacheDir || getDefaultCacheDir();

  // Check for existing cache
  const cachedVersion = findCachedVersion(dir);
  if (cachedVersion) {
    const cachedYear = parseInt(cachedVersion, 10);

    // If cached version is already at or beyond last releasable year, use it
    if (cachedYear >= lastReleasableYear) {
      return cachedVersion;
    }

    // Check for versions between cache and last releasable year
    log(`Checking for newer version...`);
    for (let year = cachedYear + 1; year <= lastReleasableYear; year++) {
      const version = year.toString();
      if (await urlExists(getDownloadUrl(version))) {
        log(`Found ${version}`);
        return version;
      }
    }
    // No newer version found, use cache
    return cachedVersion;
  }

  // No cache - discover from BASE_VERSION
  log(`Checking available versions...`);
  if (await urlExists(getDownloadUrl(BASE_VERSION))) {
    // Check if there's a newer version (up to last releasable year)
    for (let year = baseYear + 1; year <= lastReleasableYear; year++) {
      const version = year.toString();
      if (await urlExists(getDownloadUrl(version))) {
        continue; // Keep checking for even newer
      } else {
        return (year - 1).toString();
      }
    }
    // All years up to lastReleasableYear exist, return that
    return lastReleasableYear.toString();
  }

  // Base version doesn't exist, try incrementing
  for (let year = baseYear + 1; year <= lastReleasableYear; year++) {
    const version = year.toString();
    if (await urlExists(getDownloadUrl(version))) {
      return version;
    }
  }

  throw new Error(
    `No WordNet version found between ${BASE_VERSION} and ${lastReleasableYear}`
  );
}

/** Download and decompress WordNet XML from remote URL */
async function downloadWordNet(version: string, destPath: string): Promise<void> {
  const url = getDownloadUrl(version);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download WordNet ${version}: ${response.statusText}`);
  }

  const decompressed = response.body.pipeThrough(new DecompressionStream("gzip"));
  const arrayBuffer = await new Response(decompressed).arrayBuffer();

  // Ensure directory exists
  const dir = path.dirname(destPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(destPath, Buffer.from(arrayBuffer));
}

/** Create XML streaming parser for WordNet file */
export function createParser(filePath: string) {
  const resolvedPath = path.resolve(filePath);
  const nodeStream = createReadStream(resolvedPath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
  return parse(webStream, {
    ignoreDeclaration: false,
    silent: false,
  });
}

/** Parse Lexicon from XML stream */
export async function parseLexicon(
  parser: AsyncGenerator<Node, void | Node, void>
): Promise<Lexicon | undefined> {
  for await (const node of parser) {
    if (node.type === "Lexicon") {
      return LexiconNode(node);
    }
  }
  return undefined;
}

export interface LoadOptions {
  /** Specific version to download (e.g., "2024"). If not set, finds latest. */
  version?: string;
  /** Custom cache directory for downloaded data */
  cacheDir?: string;
  /** Force re-download even if cached */
  forceDownload?: boolean;
  /** Callback for progress updates */
  onProgress?: (message: string) => void;
}

export interface LoadResult {
  lexicon: Lexicon;
  version: string;
  filePath: string;
}

/**
 * Load WordNet from a local file path.
 * @param filePath Path to the WordNet XML file
 */
export async function loadWordNet(filePath: string): Promise<Lexicon> {
  if (!fileExists(filePath)) {
    throw new Error(`WordNet file not found: ${filePath}`);
  }

  const parser = createParser(filePath);
  const lexicon = await parseLexicon(parser);

  if (!lexicon) {
    throw new Error("Failed to parse WordNet: no Lexicon node found");
  }

  return lexicon;
}

/**
 * Fetch WordNet from remote URL, cache locally, and parse.
 * If no version specified, finds the latest available version.
 * @param options Loading options
 * @returns LoadResult with lexicon, version, and file path
 */
export async function fetchWordNet(options: LoadOptions = {}): Promise<LoadResult> {
  const cacheDir = options.cacheDir || getDefaultCacheDir();
  const log = options.onProgress || (() => {});

  // Determine version to use
  const version = options.version || await findLatestVersion(log, cacheDir);
  const filename = getFilename(version);
  const cachedPath = path.join(cacheDir, filename);

  if (!fileExists(cachedPath) || options.forceDownload) {
    const url = getDownloadUrl(version);
    log(`Downloading WordNet ${version} from ${url}`);
    await downloadWordNet(version, cachedPath);
    log(`Saved to ${cachedPath}`);
  } else {
    log(`Using cached ${cachedPath}`);
  }

  const lexicon = await loadWordNet(cachedPath);
  return { lexicon, version, filePath: cachedPath };
}

/**
 * Get path to cached WordNet file (downloads if not present).
 * Useful when you want to work with the file directly.
 * @returns Object with file path and version
 */
export async function ensureWordNetCached(
  options: LoadOptions = {}
): Promise<{ filePath: string; version: string }> {
  const cacheDir = options.cacheDir || getDefaultCacheDir();
  const log = options.onProgress || (() => {});

  // Determine version to use
  const version = options.version || await findLatestVersion(log, cacheDir);
  const filename = getFilename(version);
  const cachedPath = path.join(cacheDir, filename);

  if (!fileExists(cachedPath) || options.forceDownload) {
    const url = getDownloadUrl(version);
    log(`Downloading WordNet ${version} from ${url}`);
    await downloadWordNet(version, cachedPath);
    log(`Saved to ${cachedPath}`);
  } else {
    log(`Using cached ${cachedPath}`);
  }

  return { filePath: cachedPath, version };
}

// Legacy exports for backwards compatibility
export const WORDNET_VERSION = BASE_VERSION;
export const WORDNET_FILENAME = getFilename(BASE_VERSION);
export const WORDNET_URL = getDownloadUrl(BASE_VERSION);
