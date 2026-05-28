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
 * Resolve TypeScript using the parser's shared loader, which tries the
 * linter's require first (matching what typescript-eslint resolves) before
 * falling back to cwd and this package.
 */
function loadProjectTypeScript(): TsLike | null {
  try {
    return loadNewestModule<TsLike>("typescript");
  } catch {
    return null;
  }
}

/** Patch every `typescript.js` already in `require.cache`. */
function patchAllLoadedTypeScripts(): void {
  const req = createRequire(import.meta.url);
  const cache = (req as unknown as { cache?: Record<string, NodeModule> })
    .cache;
  if (!cache) return;
  for (const [resolvedPath, mod] of Object.entries(cache)) {
    if (
      resolvedPath.includes(`${path.sep}typescript${path.sep}`) &&
      resolvedPath.endsWith(`${path.sep}typescript.js`)
    ) {
      const exports = (mod as { exports?: TsLike } | undefined)?.exports;
      patchTsSys(exports?.sys);
    }
  }
}

/** Idempotent. No-op unless `SVELTE_ESLINT_PARSER_TS_SYS_HOOK=1`. */
export function installTsSysHook(): void {
  if (installed) return;
  // eslint-disable-next-line no-process-env -- intentional opt-in gate
  if (process.env[ENV_FLAG] !== "1") return;

  const ts = loadProjectTypeScript();
  if (ts?.sys) patchTsSys(ts.sys);
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
