import fs from "fs";
import path from "path";
import { createRequire } from "module";
import type { NormalizedParserOptions } from "./parser/parser-options.js";
import { svelteToVirtualTypeScript } from "./parser/svelte-to-virtual-ts.js";
import { loadNewestModule } from "./utils/cjs-module.js";

/**
 * Experimental hook that intercepts `ts.sys.readFile` and returns virtual
 * TypeScript for `.svelte` paths. ESLint's own reads go through `fs` and
 * are unaffected. Activate with `SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`.
 *
 * Several preconditions must hold for the hook to actually speed anything up
 * (extraFileExtensions includes '.svelte', type-aware lint is on, the TS
 * instance is reachable through CJS require.cache). When the hook is opted
 * in but a precondition fails, a warning is emitted so users can diagnose
 * why no speed-up materialised.
 */

const ENV_FLAG = "SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK";

interface TranslationEntry {
  mtimeMs: number;
  // `null` means "no virtual translation at this mtime" — a negative cache
  // so JS-only `.svelte` files don't pay a full Svelte parse on every read.
  virtualCode: string | null;
}

interface TsLike {
  sys?: {
    readFile?: (path: string, encoding?: string) => string | undefined;
    fileExists?: (path: string) => boolean;
  };
}

// TypeScript does not recognise the `.svelte` extension, so module resolution
// falls back to appending `.ts` and probes `X.svelte.ts`. Serving the
// component's virtual TypeScript there makes the import resolve to the real
// prop types instead of Svelte's permissive ambient `declare module '*.svelte'`.
const SVELTE_COMPANION_SUFFIX = ".svelte.ts";

const translations = new Map<string, TranslationEntry>();
const patchedSysObjects = new WeakSet();
let activeParserOptions: NormalizedParserOptions | null = null;
let installed = false;
let needsParseTimeRescan = false;
let parserOptionsInspected = false;
let patchAppliedCount = 0;
let primeStoredCount = 0;
let svelteReadFileCount = 0;
// The collision warning sits in a hot resolution path, so it fires at most once
// per process rather than once per file.
let companionConflictWarned = false;

function warn(msg: string): void {
  process.stderr.write(`[svelte-eslint-parser:ts-sys-hook] WARNING: ${msg}\n`);
}

/** Called from `parseForESLint` so translation has the user's parser config. */
export function rememberParserOptions(options: NormalizedParserOptions): void {
  activeParserOptions = options;

  if (installed && !parserOptionsInspected) {
    parserOptionsInspected = true;
    inspectParserOptions(options);
  }

  // Catch a TypeScript instance that landed in `require.cache` between
  // `installTsSysHook` and the first parse (e.g. typescript-eslint loaded
  // after svelte-eslint-parser in `eslint.config.js`). Walking on every
  // subsequent parse would be wasteful and gains nothing — TS instances
  // are not added back later in a typical lint run.
  if (!needsParseTimeRescan) return;
  needsParseTimeRescan = false;
  patchAllLoadedTypeScripts();
}

function inspectParserOptions(options: NormalizedParserOptions): void {
  // `extraFileExtensions` lives on the raw options object; normalize spreads
  // it through, even though it isn't part of the typed interface.
  const raw = options as unknown as Record<string, unknown>;
  const extra = raw.extraFileExtensions;
  const hasSvelteExt =
    Array.isArray(extra) && (extra as unknown[]).includes(".svelte");
  if (!hasSvelteExt) {
    warn(
      "parserOptions.extraFileExtensions does not include '.svelte'. " +
        "ts.sys.readFile will not be called for .svelte paths, so the hook " +
        "cannot speed anything up.",
    );
  }
  if (
    options.project == null &&
    options.projectService == null &&
    options.EXPERIMENTAL_useProjectService == null
  ) {
    warn(
      "neither `project` nor `projectService` is configured. The hook only " +
        "helps when typescript-eslint is doing type-aware lint.",
    );
  }
}

/** Seed the cache so a later `ts.sys.readFile` skips re-translating. */
export function primeTranslationCache(
  filePath: string,
  virtualCode: string,
): void {
  if (!installed) return;
  // Skip the stat + write if on-demand translation already cached a positive
  // entry — the prime is redundant when ts.sys read the file before ESLint did.
  const existing = translations.get(filePath);
  if (existing && existing.virtualCode !== null) return;
  const mtimeMs = statMtimeMs(filePath);
  if (mtimeMs === null) return;
  translations.set(filePath, { mtimeMs, virtualCode });
  primeStoredCount++;
}

function statMtimeMs(filePath: string): number | null {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}

function realFileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/** Virtual code of the `X.svelte` behind a probed `X.svelte.ts`, or `null` to fall through. */
function translateCompanion(companionPath: string): string | null {
  if (!companionPath.endsWith(SVELTE_COMPANION_SUFFIX)) return null;
  const sveltePath = companionPath.slice(0, -".ts".length);
  // A real runes module wins; never shadow it.
  if (realFileExists(companionPath)) {
    warnCompanionConflict(companionPath, sveltePath);
    return null;
  }
  return translateOnDemand(sveltePath);
}

/**
 * Only a real `X.svelte.ts` next to a real `X.svelte` costs the user anything:
 * the guard above suppresses the virtual companion, so `./X.svelte` resolves to
 * the runes module and the component's prop types stay unavailable.
 */
function warnCompanionConflict(
  companionPath: string,
  sveltePath: string,
): void {
  if (companionConflictWarned) return;
  if (!realFileExists(sveltePath)) return;
  companionConflictWarned = true;
  warn(
    `${sveltePath} and ${companionPath} both exist. TypeScript resolves ` +
      `'./${path.basename(sveltePath)}' to the module, so component prop ` +
      "types are not available for this component. The lint rule " +
      "'svelte/no-conflicting-module-names' (eslint-plugin-svelte >= 3.22.0) " +
      "reports this name collision.",
  );
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
  if (svelteSource === null) {
    translations.set(filePath, { mtimeMs, virtualCode: null });
    return null;
  }

  const virtualCode = svelteToVirtualTypeScript(
    filePath,
    svelteSource,
    activeParserOptions,
  );
  // Store the outcome — including `null` — to negative-cache failed translations.
  translations.set(filePath, { mtimeMs, virtualCode });
  return virtualCode;
}

function patchTsSys(sys: TsLike["sys"]): void {
  if (!sys || typeof sys.readFile !== "function") return;
  if (patchedSysObjects.has(sys)) return;
  patchedSysObjects.add(sys);
  patchAppliedCount++;

  const originalReadFile = sys.readFile.bind(sys);
  sys.readFile = (filePath: string, encoding?: string) => {
    if (typeof filePath === "string") {
      // `X.svelte` is the component being linted; the `X.svelte.ts` companion is
      // what module resolution probes for an imported component.
      if (filePath.endsWith(".svelte")) {
        svelteReadFileCount++;
        const virtual = translateOnDemand(filePath);
        if (virtual !== null) return virtual;
      } else if (filePath.endsWith(SVELTE_COMPANION_SUFFIX)) {
        const virtual = translateCompanion(filePath);
        if (virtual !== null) {
          svelteReadFileCount++;
          return virtual;
        }
      }
    }
    return originalReadFile(filePath, encoding);
  };

  // Claim the companion exists so module resolution reaches the `readFile`
  // above; otherwise resolution fails and falls back to the ambient module.
  if (typeof sys.fileExists === "function") {
    const originalFileExists = sys.fileExists.bind(sys);
    sys.fileExists = (filePath: string) => {
      if (
        typeof filePath === "string" &&
        filePath.endsWith(SVELTE_COMPANION_SUFFIX) &&
        translateCompanion(filePath) !== null
      ) {
        return true;
      }
      return originalFileExists(filePath);
    };
  }
}

/**
 * Force-load the project's TypeScript so it lands in `require.cache`. The
 * patch then happens through `patchAllLoadedTypeScripts`; no need to capture
 * the returned module ourselves.
 */
function ensureTypeScriptLoaded(): void {
  try {
    loadNewestModule<TsLike>("typescript");
  } catch (e) {
    warn(
      `failed to load 'typescript' from the project: ${
        e instanceof Error ? e.message : String(e)
      }. The hook has nothing to patch.`,
    );
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

/** Idempotent. No-op unless `SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`. */
export function installTsSysHook(): void {
  if (installed) return;
  // eslint-disable-next-line no-process-env -- intentional opt-in gate
  if (process.env[ENV_FLAG] !== "1") return;

  ensureTypeScriptLoaded();
  patchAllLoadedTypeScripts();
  installed = true;
  // Arm a one-shot rescan; see `rememberParserOptions`.
  needsParseTimeRescan = true;

  // End-of-run check: if .svelte files were linted but the patched readFile
  // was never hit for any of them, the hook silently did nothing.
  process.on("exit", () => {
    if (primeStoredCount > 0 && svelteReadFileCount === 0) {
      warn(
        "ts.sys.readFile was never called for a .svelte path even though " +
          `${primeStoredCount} .svelte file(s) were parsed. Likely causes: ` +
          "parserOptions.extraFileExtensions missing '.svelte', " +
          "typescript-eslint not running type-aware lint, " +
          "or the TS instance it uses was not in CJS require.cache " +
          "(e.g. ESM-loaded).",
      );
    } else if (patchAppliedCount === 0) {
      warn(
        "no `typescript.js` was found in CJS require.cache, so nothing was " +
          "patched. The TS instance used by typescript-eslint may be " +
          "ESM-loaded or otherwise outside the cache.",
      );
    }
  });

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
  // Re-arm the once-per-process warning so tests don't depend on suite order.
  companionConflictWarned = false;
}

/** Test seam: patch a caller-supplied `sys` instead of the require.cache ones. */
export function _patchTsSysForTesting(sys: TsLike["sys"]): void {
  patchTsSys(sys);
}
