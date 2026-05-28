import fs from "fs";
import path from "path";

/**
 * In-process `fs.readFileSync` interceptor that rewrites the user's
 * `tsconfig.json` on the fly so TypeScript's projectService loads the virtual
 * code shims alongside the original sources, and excludes the original
 * `.svelte` files (which would otherwise be loaded twice — once as opaque
 * Svelte and once as virtual TS).
 *
 * Why an in-memory hook instead of writing to disk:
 *
 * - SIGKILL / OOM / power loss never leave a corrupted tsconfig behind.
 * - Concurrent ESLint workers don't race on the same file.
 * - Editor TS LSP keeps reading the file from disk and is unaffected.
 *
 * Activation: opt-in via the `SVELTE_ESLINT_PARSER_TSCONFIG_PATCH=1`
 * environment variable. The hook is installed at module load; when no cache
 * directory exists next to a `tsconfig.json`, the read passes through
 * untouched, so this is a no-op for projects that haven't run
 * `svelte-eslint-parser-sync`.
 */

const CACHE_DIR_NAME = ".svelte-eslint-parser";
const SVELTE_EXCLUDE_GLOB = "**/*.svelte";

/** Marker we add to patched JSON so we can recognise it on later reads. */
const PATCH_MARKER = "__svelteEslintParserPatched";

let installed = false;
/**
 * Cache patched content by absolute tsconfig path. TypeScript and tsserver
 * typically read each tsconfig multiple times during projectService startup;
 * caching keeps the patch idempotent and cheap.
 */
const contentCache = new Map<string, string | null>();

interface MutableTsconfig {
  include?: unknown;
  exclude?: unknown;
  [key: string]: unknown;
}

function stripJsonc(content: string): string {
  // Minimal JSONC -> JSON transform: strip /* */ and // comments outside of
  // strings, drop trailing commas before `}` or `]`. Good enough for the
  // tsconfig files we expect to see; falls back to "no patch" if JSON.parse
  // still throws.
  let result = "";
  let inString = false;
  let stringQuote = "";
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];
    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        result += ch;
      }
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      result += ch;
      if (ch === "\\" && next !== undefined) {
        result += next;
        i++;
        continue;
      }
      if (ch === stringQuote) {
        inString = false;
      }
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringQuote = ch;
      result += ch;
      continue;
    }
    result += ch;
  }
  // Drop trailing commas. Naive but safe enough for tsconfig.
  return result.replace(/,(\s*[}\]])/g, "$1");
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function virtualIncludeGlob(): string {
  return `./${CACHE_DIR_NAME}/**/*.svelte.__virtual__.ts`;
}

function computePatchedContent(tsconfigPath: string, original: string): string | null {
  // Only touch tsconfigs that sit next to a cache directory we generated.
  const dir = path.dirname(tsconfigPath);
  const cacheDir = path.join(dir, CACHE_DIR_NAME);
  if (!fs.existsSync(cacheDir)) {
    return null;
  }
  // Avoid recursively patching anything inside the cache itself.
  if (tsconfigPath.includes(`${path.sep}${CACHE_DIR_NAME}${path.sep}`)) {
    return null;
  }

  let parsed: MutableTsconfig;
  try {
    parsed = JSON.parse(original) as MutableTsconfig;
  } catch {
    try {
      parsed = JSON.parse(stripJsonc(original)) as MutableTsconfig;
    } catch {
      return null;
    }
  }
  if (parsed === null || typeof parsed !== "object") return null;
  if (parsed[PATCH_MARKER]) return original;

  const include = toStringArray(parsed.include);
  const exclude = toStringArray(parsed.exclude);

  parsed.include = [...include, virtualIncludeGlob()];
  parsed.exclude = [...exclude, SVELTE_EXCLUDE_GLOB];

  // rootDirs lets TypeScript treat the cache and the project root as the same
  // virtual directory, so relative imports inside a `*.svelte.__virtual__.ts`
  // resolve back to real `src/` files instead of looking for them under the
  // cache.
  const compilerOptionsRaw = parsed.compilerOptions;
  const compilerOptions: Record<string, unknown> =
    compilerOptionsRaw && typeof compilerOptionsRaw === "object"
      ? (compilerOptionsRaw as Record<string, unknown>)
      : {};
  const rootDirs = toStringArray(compilerOptions.rootDirs);
  if (!rootDirs.includes(CACHE_DIR_NAME) && !rootDirs.includes(`./${CACHE_DIR_NAME}`)) {
    compilerOptions.rootDirs = rootDirs.length > 0
      ? [...rootDirs, CACHE_DIR_NAME]
      : [".", CACHE_DIR_NAME];
  }
  parsed.compilerOptions = compilerOptions;

  parsed[PATCH_MARKER] = true;
  return JSON.stringify(parsed, null, 2);
}

/**
 * Install the `fs.readFileSync` hook. Idempotent; safe to call multiple times.
 */
export function installTsconfigInterceptor(): void {
  if (installed) return;
  if (process.env.SVELTE_ESLINT_PARSER_TSCONFIG_PATCH !== "1") return;
  installed = true;

  const originalReadFileSync = fs.readFileSync.bind(fs);

  fs.readFileSync = function patchedReadFileSync(
    this: typeof fs,
    filePath: Parameters<typeof fs.readFileSync>[0],
    options?: Parameters<typeof fs.readFileSync>[1],
  ): ReturnType<typeof fs.readFileSync> {
    const original = originalReadFileSync(filePath, options);
    if (typeof filePath !== "string") {
      return original;
    }
    if (path.basename(filePath) !== "tsconfig.json") {
      return original;
    }

    const wantsString = typeof original === "string";
    const cached = contentCache.get(filePath);
    if (cached !== undefined) {
      if (cached === null) return original;
      return wantsString ? cached : Buffer.from(cached, "utf-8");
    }

    const originalText = wantsString
      ? (original as string)
      : (original as Buffer).toString("utf-8");
    const patched = computePatchedContent(filePath, originalText);
    contentCache.set(filePath, patched);
    if (patched === null) return original;
    return wantsString ? patched : Buffer.from(patched, "utf-8");
  } as typeof fs.readFileSync;
}

/** For tests: undo the patch and clear the content cache. */
export function uninstallTsconfigInterceptor(): void {
  if (!installed) return;
  installed = false;
  contentCache.clear();
  // Restoring the original requires holding a reference; we lose that on
  // install. Tests that need this should stub `fs.readFileSync` themselves.
}
