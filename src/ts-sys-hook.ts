import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import type { NormalizedParserOptions } from "./parser/parser-options.js";
import { svelteToVirtualTypeScript } from "./parser/svelte-to-virtual-ts.js";

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

/** Called from `parseForESLint` so translation has the user's parser config. */
export function rememberParserOptions(options: NormalizedParserOptions): void {
  activeParserOptions = options;
  // Off when not installed: otherwise we'd patch TS instances loaded by
  // unrelated tooling (e.g. svelte2tsx in `update-fixtures`).
  if (!installed) return;
  // Catch TypeScript instances loaded after `installTsSysHook` ran (peer
  // resolution in non-hoisted monorepos).
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

/** Resolve TypeScript from the user's project (cwd → here → self). */
function loadProjectTypeScript(): TsLike | null {
  const here =
    typeof __dirname !== "undefined"
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));
  const requireRoots = [
    path.join(process.cwd(), "package.json"),
    path.join(here, "package.json"),
  ];
  for (const requireRoot of requireRoots) {
    try {
      return createRequire(requireRoot)("typescript") as TsLike;
    } catch {
      // try next root
    }
  }
  try {
    return createRequire(import.meta.url)("typescript") as TsLike;
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

  // Visible on every lint run so users know they opted into an experiment.
  process.stderr.write(
    `[svelte-eslint-parser] ${ENV_FLAG}=1 enables an experimental ts.sys.readFile hook. ` +
      `Behaviour and API may change or be removed in any release.\n`,
  );
}

/** Test seam. The `ts.sys` patches themselves are intentionally permanent. */
export function _resetTranslationCacheForTesting(): void {
  translations.clear();
  activeParserOptions = null;
}
