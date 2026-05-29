import fs from "fs";
import path from "path";
import { createRequire } from "module";
import type { NormalizedParserOptions } from "./parser/parser-options.js";
import { svelteToVirtualTypeScript } from "./parser/svelte-to-virtual-ts.js";
import { loadNewestModule } from "./utils/cjs-module.js";

/**
 * Experimental hook that intercepts `ts.sys.readFile` and returns virtual
 * TypeScript for `.svelte` paths. ESLint's own reads go through `fs` and
 * are unaffected. Activate with `SVELTE_ESLINT_PARSER_TS_SYS_HOOK=1`.
 */

const ENV_FLAG = "SVELTE_ESLINT_PARSER_TS_SYS_HOOK";

interface TranslationEntry {
  mtimeMs: number;
  virtualCode: string;
}

interface TsLike {
  sys?: {
    readFile?: (path: string, encoding?: string) => string | undefined;
  };
}

const translations = new Map<string, TranslationEntry>();
const patchedSysObjects = new WeakSet();
let activeParserOptions: NormalizedParserOptions | null = null;
let installed = false;
let needsParseTimeRescan = false;

/** Called from `parseForESLint` so translation has the user's parser config. */
export function rememberParserOptions(options: NormalizedParserOptions): void {
  activeParserOptions = options;
  // Catch a TypeScript instance that landed in `require.cache` between
  // `installTsSysHook` and the first parse (e.g. typescript-eslint loaded
  // after svelte-eslint-parser in `eslint.config.js`). Walking on every
  // subsequent parse would be wasteful and gains nothing — TS instances
  // are not added back later in a typical lint run.
  if (!needsParseTimeRescan) return;
  needsParseTimeRescan = false;
  patchAllLoadedTypeScripts();
}

/**
 * Seed the translation cache from the parser's own pipeline. The parser
 * already produces virtual TS for the file it is currently parsing;
 * stashing it here lets `ts.sys.readFile` serve the same string without
 * re-running `analyzeTypeScriptInSvelte` if `projectService` later reaches
 * for the file on disk.
 */
export function primeTranslationCache(
  filePath: string,
  virtualCode: string,
): void {
  if (!installed) return;
  const mtimeMs = statMtimeMs(filePath);
  if (mtimeMs === null) return;
  translations.set(filePath, { mtimeMs, virtualCode });
}

function statMtimeMs(filePath: string): number | null {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}

function readUtf8(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function translateOnDemand(filePath: string): string | null {
  if (!activeParserOptions) return null;

  const mtimeMs = statMtimeMs(filePath);
  if (mtimeMs === null) return null;

  const cached = translations.get(filePath);
  if (cached && cached.mtimeMs === mtimeMs) return cached.virtualCode;

  const svelteSource = readUtf8(filePath);
  if (svelteSource === null) return null;

  const virtualCode = svelteToVirtualTypeScript(
    filePath,
    svelteSource,
    activeParserOptions,
  );
  if (virtualCode === null) return null;

  translations.set(filePath, { mtimeMs, virtualCode });
  return virtualCode;
}

function patchTsSys(sys: TsLike["sys"]): void {
  if (!sys || typeof sys.readFile !== "function") return;
  if (patchedSysObjects.has(sys)) return;
  patchedSysObjects.add(sys);

  const originalReadFile = sys.readFile.bind(sys);
  sys.readFile = (filePath: string, encoding?: string) => {
    if (typeof filePath === "string" && filePath.endsWith(".svelte")) {
      const virtual = translateOnDemand(filePath);
      if (virtual !== null) return virtual;
    }
    return originalReadFile(filePath, encoding);
  };
}

/**
 * Force-load the project's TypeScript so it lands in `require.cache`. The
 * patch then happens through `patchAllLoadedTypeScripts`; no need to capture
 * the returned module ourselves.
 */
function ensureTypeScriptLoaded(): void {
  try {
    loadNewestModule<TsLike>("typescript");
  } catch {
    // TypeScript isn't installed in the project; the hook has nothing to
    // patch and will simply be a no-op.
  }
}

/** Patch every `typescript.js` already in `require.cache`. */
function patchAllLoadedTypeScripts(): void {
  const cache = createRequire(import.meta.url).cache as
    | Record<string, { exports?: TsLike } | undefined>
    | undefined;
  if (!cache) return;
  for (const [resolvedPath, mod] of Object.entries(cache)) {
    if (
      resolvedPath.includes(`${path.sep}typescript${path.sep}`) &&
      resolvedPath.endsWith(`${path.sep}typescript.js`)
    ) {
      patchTsSys(mod?.exports?.sys);
    }
  }
}

/** Idempotent. No-op unless `SVELTE_ESLINT_PARSER_TS_SYS_HOOK=1`. */
export function installTsSysHook(): void {
  if (installed) return;
  // eslint-disable-next-line no-process-env -- intentional opt-in gate
  if (process.env[ENV_FLAG] !== "1") return;

  ensureTypeScriptLoaded();
  patchAllLoadedTypeScripts();
  installed = true;
  // Arm a one-shot rescan; see `rememberParserOptions`.
  needsParseTimeRescan = true;

  // Visible on every lint run so users know they opted into an experiment.
  process.stderr.write(
    `[svelte-eslint-parser] ${ENV_FLAG}=1 enables an experimental ts.sys.readFile hook. ` +
      `Behavior and API may change or be removed in any release.\n`,
  );
}

/** Test seam. The `ts.sys` patches themselves are intentionally permanent. */
export function _resetTranslationCacheForTesting(): void {
  translations.clear();
  activeParserOptions = null;
  needsParseTimeRescan = false;
}
