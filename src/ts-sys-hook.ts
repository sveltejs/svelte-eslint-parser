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
const DEBUG_FLAG = "SVELTE_ESLINT_PARSER_TS_SYS_HOOK_DEBUG";

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
const patchedTsPaths = new Set<string>();
let activeParserOptions: NormalizedParserOptions | null = null;
let installed = false;
let needsParseTimeRescan = false;
let firstParserOptionsLogged = false;

// Debug counters. Cheap when DEBUG flag is off; useful when on.
const counters = {
  readFileCalls: 0,
  readFileSvelte: 0,
  readFileSvelteCacheHit: 0,
  readFileSvelteTranslated: 0,
  readFileSvelteFallback: 0,
  readFileNonSvelte: 0,
  primeCalls: 0,
  primeSkippedNotInstalled: 0,
  primeSkippedNoMtime: 0,
  primeStored: 0,
  rescans: 0,
  patchAttempts: 0,
  patchApplied: 0,
};

function debug(msg: string): void {
  // eslint-disable-next-line no-process-env -- intentional opt-in gate
  if (process.env[DEBUG_FLAG] !== "1") return;
  process.stderr.write(`[svelte-eslint-parser:ts-sys-hook] ${msg}\n`);
}

function isDebug(): boolean {
  // eslint-disable-next-line no-process-env -- intentional opt-in gate
  return process.env[DEBUG_FLAG] === "1";
}

/** Called from `parseForESLint` so translation has the user's parser config. */
export function rememberParserOptions(options: NormalizedParserOptions): void {
  activeParserOptions = options;

  if (isDebug() && !firstParserOptionsLogged) {
    firstParserOptionsLogged = true;
    // `extraFileExtensions` lives on the raw options object; normalize spreads
    // it through, even though it isn't part of the typed interface.
    const raw = options as unknown as Record<string, unknown>;
    const extra = raw.extraFileExtensions;
    const hasSvelteExt =
      Array.isArray(extra) && (extra as unknown[]).includes(".svelte");
    debug(
      `first parserOptions: ` +
        `installed=${installed} ` +
        `filePath=${options.filePath ?? "<none>"} ` +
        `project=${
          options.project == null ? "<none>" : JSON.stringify(options.project)
        } ` +
        `projectService=${
          options.projectService == null
            ? "<none>"
            : JSON.stringify(options.projectService)
        } ` +
        `EXPERIMENTAL_useProjectService=${
          options.EXPERIMENTAL_useProjectService == null
            ? "<none>"
            : JSON.stringify(options.EXPERIMENTAL_useProjectService)
        } ` +
        `extraFileExtensions=${
          extra == null ? "<none>" : JSON.stringify(extra)
        } ` +
        `extraFileExtensions.includes('.svelte')=${hasSvelteExt}`,
    );
    if (!hasSvelteExt) {
      debug(
        "WARNING: parserOptions.extraFileExtensions does not include '.svelte'. " +
          "ts.sys.readFile will not be called for .svelte paths, so the hook " +
          "cannot speed anything up.",
      );
    }
    if (
      options.project == null &&
      options.projectService == null &&
      options.EXPERIMENTAL_useProjectService == null
    ) {
      debug(
        "WARNING: neither project nor projectService is configured. The hook " +
          "only helps when typescript-eslint is doing type-aware lint.",
      );
    }
  }

  // Catch a TypeScript instance that landed in `require.cache` between
  // `installTsSysHook` and the first parse (e.g. typescript-eslint loaded
  // after svelte-eslint-parser in `eslint.config.js`). Walking on every
  // subsequent parse would be wasteful and gains nothing — TS instances
  // are not added back later in a typical lint run.
  if (!needsParseTimeRescan) return;
  needsParseTimeRescan = false;
  counters.rescans++;
  debug("parse-time rescan triggered");
  patchAllLoadedTypeScripts();
}

/** Seed the cache so a later `ts.sys.readFile` skips re-translating. */
export function primeTranslationCache(
  filePath: string,
  virtualCode: string,
): void {
  counters.primeCalls++;
  if (!installed) {
    counters.primeSkippedNotInstalled++;
    return;
  }
  const mtimeMs = statMtimeMs(filePath);
  if (mtimeMs === null) {
    counters.primeSkippedNoMtime++;
    debug(`primeTranslationCache: skipped (no mtime) ${filePath}`);
    return;
  }
  translations.set(filePath, { mtimeMs, virtualCode });
  counters.primeStored++;
  debug(`primeTranslationCache: stored ${filePath} (${virtualCode.length}B)`);
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

type TranslateOutcome =
  | { kind: "cache-hit"; virtualCode: string }
  | { kind: "translated"; virtualCode: string }
  | { kind: "no-parser-options" }
  | { kind: "no-mtime" }
  | { kind: "no-source" }
  | { kind: "translation-failed" };

function translateOnDemand(filePath: string): TranslateOutcome {
  if (!activeParserOptions) return { kind: "no-parser-options" };

  const mtimeMs = statMtimeMs(filePath);
  if (mtimeMs === null) return { kind: "no-mtime" };

  const cached = translations.get(filePath);
  if (cached && cached.mtimeMs === mtimeMs) {
    return { kind: "cache-hit", virtualCode: cached.virtualCode };
  }

  const svelteSource = readUtf8(filePath);
  if (svelteSource === null) return { kind: "no-source" };

  const virtualCode = svelteToVirtualTypeScript(
    filePath,
    svelteSource,
    activeParserOptions,
  );
  if (virtualCode === null) return { kind: "translation-failed" };

  translations.set(filePath, { mtimeMs, virtualCode });
  return { kind: "translated", virtualCode };
}

function patchTsSys(sys: TsLike["sys"], origin: string): void {
  counters.patchAttempts++;
  if (!sys || typeof sys.readFile !== "function") {
    debug(`patchTsSys: skipped (no sys.readFile) origin=${origin}`);
    return;
  }
  if (patchedSysObjects.has(sys)) {
    debug(`patchTsSys: skipped (already patched) origin=${origin}`);
    return;
  }
  patchedSysObjects.add(sys);
  counters.patchApplied++;
  debug(`patchTsSys: applied origin=${origin}`);

  const originalReadFile = sys.readFile.bind(sys);
  sys.readFile = (filePath: string, encoding?: string) => {
    counters.readFileCalls++;
    if (typeof filePath === "string" && filePath.endsWith(".svelte")) {
      counters.readFileSvelte++;
      const outcome = translateOnDemand(filePath);
      switch (outcome.kind) {
        case "cache-hit":
          counters.readFileSvelteCacheHit++;
          debug(`readFile: cache-hit ${filePath}`);
          return outcome.virtualCode;
        case "translated":
          counters.readFileSvelteTranslated++;
          debug(`readFile: translated ${filePath}`);
          return outcome.virtualCode;
        default:
          counters.readFileSvelteFallback++;
          debug(`readFile: fallback (${outcome.kind}) ${filePath}`);
          break;
      }
    } else {
      counters.readFileNonSvelte++;
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
    debug("ensureTypeScriptLoaded: ok");
  } catch (e) {
    debug(
      `ensureTypeScriptLoaded: failed (${
        e instanceof Error ? e.message : String(e)
      })`,
    );
  }
}

/** Patch every `typescript.js` already in `require.cache`. */
function patchAllLoadedTypeScripts(): void {
  const cache = createRequire(import.meta.url).cache as
    | Record<string, { exports?: TsLike } | undefined>
    | undefined;
  if (!cache) {
    debug("patchAllLoadedTypeScripts: require.cache unavailable");
    return;
  }
  const matched: string[] = [];
  for (const [resolvedPath, mod] of Object.entries(cache)) {
    if (
      resolvedPath.includes(`${path.sep}typescript${path.sep}`) &&
      resolvedPath.endsWith(`${path.sep}typescript.js`)
    ) {
      matched.push(resolvedPath);
      patchedTsPaths.add(resolvedPath);
      patchTsSys(mod?.exports?.sys, resolvedPath);
    }
  }
  debug(
    `patchAllLoadedTypeScripts: scanned ${
      Object.keys(cache).length
    } entries, matched ${matched.length} typescript.js`,
  );
  for (const p of matched) debug(`  match: ${p}`);
}

/** Idempotent. No-op unless `SVELTE_ESLINT_PARSER_TS_SYS_HOOK=1`. */
export function installTsSysHook(): void {
  if (installed) {
    debug("installTsSysHook: already installed");
    return;
  }
  // eslint-disable-next-line no-process-env -- intentional opt-in gate
  const envValue = process.env[ENV_FLAG];
  if (envValue !== "1") {
    debug(
      `installTsSysHook: env flag ${ENV_FLAG}=${
        envValue == null ? "<unset>" : JSON.stringify(envValue)
      }, not installing`,
    );
    return;
  }

  debug(`installTsSysHook: ${ENV_FLAG}=1, installing`);
  ensureTypeScriptLoaded();
  patchAllLoadedTypeScripts();
  installed = true;
  // Arm a one-shot rescan; see `rememberParserOptions`.
  needsParseTimeRescan = true;

  if (isDebug()) {
    debug(
      `installTsSysHook: complete. patched=${counters.patchApplied} ` +
        `(skipped=${counters.patchAttempts - counters.patchApplied})`,
    );
    process.on("exit", () => {
      debug(
        `summary: readFile total=${counters.readFileCalls} ` +
          `(.svelte=${counters.readFileSvelte}, non-.svelte=${counters.readFileNonSvelte})`,
      );
      debug(
        `summary: .svelte readFile cache-hit=${counters.readFileSvelteCacheHit} ` +
          `translated=${counters.readFileSvelteTranslated} ` +
          `fallback=${counters.readFileSvelteFallback}`,
      );
      debug(
        `summary: prime calls=${counters.primeCalls} stored=${counters.primeStored} ` +
          `skip-not-installed=${counters.primeSkippedNotInstalled} ` +
          `skip-no-mtime=${counters.primeSkippedNoMtime}`,
      );
      debug(
        `summary: patch attempts=${counters.patchAttempts} applied=${counters.patchApplied} ` +
          `rescans=${counters.rescans} ts-paths=${patchedTsPaths.size}`,
      );
      if (counters.readFileSvelte === 0) {
        debug(
          "summary: WARNING — ts.sys.readFile was never called for a .svelte path. " +
            "Likely causes: parserOptions.extraFileExtensions missing '.svelte', " +
            "typescript-eslint not running type-aware lint, " +
            "or the TS instance it uses was not in CJS require.cache (e.g. ESM-loaded).",
        );
      }
    });
  }

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
