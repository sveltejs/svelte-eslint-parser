import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import type { NormalizedParserOptions } from "./parser/parser-options.js";
import { normalizeParserOptions } from "./parser/parser-options.js";
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
  // so unsupported `.svelte` files don't pay a full Svelte parse on every read.
  virtualCode: string | null;
  // Translated with fallback options before the first `.svelte` parse.
  provisional: boolean;
}

interface TsLike {
  sys?: {
    readFile?: (path: string, encoding?: string) => string | undefined;
    fileExists?: (path: string) => boolean;
    realpath?: (path: string) => string;
    useCaseSensitiveFileNames?: boolean;
  };
  server?: {
    ProjectService?: { prototype: ProjectServiceLike };
  };
}

// The parts of tsserver's `ProjectService` and `ScriptInfo` the hook uses.
interface ProjectServiceLike {
  openClientFile: (...args: unknown[]) => unknown;
  getScriptInfo: (fileName: string) => ScriptInfoLike | undefined;
}

interface ScriptInfoLike {
  isScriptOpen?: () => boolean;
  reloadFromFile?: () => boolean;
}

// TypeScript does not recognise the `.svelte` extension, so module resolution
// falls back to appending `.ts` and probes `X.svelte.ts`. Serving the
// component's virtual TypeScript there makes the import resolve to the real
// prop types instead of Svelte's permissive ambient `declare module '*.svelte'`.
const SVELTE_COMPANION_SUFFIX = ".svelte.ts";
// A `package.json` `imports`/`exports` target gets no implicit extension, so
// a `*.svelte` target probes only `X.d.svelte.ts`, which TypeScript loads only
// with `allowArbitraryExtensions`. Adding the companion as a fallback after the
// original target makes it resolve like a relative `./X.svelte` import, while a
// real `X.d.svelte.ts` still wins. Each field's subpath keys start with its own
// prefix.
const SUBPATH_FIELDS = [
  ["imports", "#"],
  ["exports", "."],
] as const;

type SubpathTarget =
  | string
  | SubpathTarget[]
  | { [condition: string]: SubpathTarget };

const translations = new Map<string, TranslationEntry>();
// `.svelte` paths whose companion TypeScript has read, with every code it got
// since the last refresh. Programs and project services read at different
// times, so they can hold different codes. Only those companions can be stale,
// and only when some reader may not hold the current code, so only those need
// a refresh after a parse. Keys come from `fileKey`.
const servedCompanions = new Map<string, Set<string>>();
const patchedSysObjects = new WeakSet();
const patchedProjectServicePrototypes = new WeakSet();
// Project services typescript-eslint has used, seen through `openClientFile`.
const projectServices = new Set<ProjectServiceLike>();
let activeParserOptions: NormalizedParserOptions | null = null;
let fallbackParserOptions: NormalizedParserOptions | null | undefined =
  undefined;
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
  const hadOptions = activeParserOptions !== null;
  activeParserOptions = options;

  // Drop fallback translations so they are redone with the real options.
  if (!hadOptions) {
    for (const [key, entry] of translations) {
      if (entry.provisional) translations.delete(key);
    }
  }

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
  // Always keep the latest parse, even an unsaved buffer: refreshed companions
  // and later `ts.sys` reads then see what was linted last, as typescript-eslint
  // does for a linted `.ts` file.
  const mtimeMs = statMtimeMs(filePath);
  if (mtimeMs === null) return;
  translations.set(fileKey(filePath), {
    mtimeMs,
    virtualCode,
    provisional: false,
  });
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
  // A package's own `X.svelte.d.ts`, as `svelte-package` emits, wins too.
  // TypeScript probes `X.svelte.ts` first, so a companion would put a
  // translation of the source in place of the types the package declares.
  if (realFileExists(`${sveltePath}.d.ts`)) return null;
  return translateOnDemand(sveltePath);
}

/** `packageJsonText` with every `.svelte` subpath target falling back to its `X.svelte.ts` companion. */
function redirectSvelteSubpathTargets(packageJsonText: string): string {
  if (
    !SUBPATH_FIELDS.some(([field]) => packageJsonText.includes(`"${field}"`))
  ) {
    return packageJsonText;
  }
  let packageJson: unknown;
  try {
    packageJson = JSON.parse(packageJsonText);
  } catch {
    return packageJsonText;
  }
  if (!isRecord(packageJson)) return packageJsonText;

  let changed = false;
  for (const [field, prefix] of SUBPATH_FIELDS) {
    const value = packageJson[field];
    const redirected = isSubpathMap(value, prefix)
      ? redirectSubpathMap(value)
      : redirectRootTarget(field, value);
    if (redirected !== value) {
      packageJson[field] = redirected;
      changed = true;
    }
  }
  return changed ? JSON.stringify(packageJson) : packageJsonText;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Whether `value` maps subpaths to targets, rather than being the bare target of the package root. */
function isSubpathMap(
  value: unknown,
  prefix: string,
): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    Object.keys(value).every((subpath) => subpath.startsWith(prefix))
  );
}

/** An `exports` value that is the package root's own target; `imports` has no such form. */
function redirectRootTarget(field: string, value: unknown): unknown {
  if (field !== "exports") return value;
  return toCompanionTarget(value) ?? value;
}

function redirectSubpathMap(
  subpaths: Record<string, unknown>,
): Record<string, unknown> {
  const redirected: Record<string, unknown> = {};
  let changed = false;
  for (const [subpath, target] of Object.entries(subpaths)) {
    if (subpath.endsWith("*") && !(`${subpath}.svelte` in subpaths)) {
      // Every `*` in a target is replaced, so `./src/*/*` cannot be extended
      // with a suffix; only a single trailing `*` is.
      const sibling = mapTargetLeaves(target, (leaf) =>
        isRelative(leaf) && leaf.indexOf("*") === leaf.length - 1
          ? withCompanionFallback(`${leaf}.svelte`)
          : null,
      );
      if (sibling !== null) {
        redirected[`${subpath}.svelte`] = sibling;
        changed = true;
      }
    }
    const companion = toCompanionTarget(target);
    if (companion !== null) changed = true;
    redirected[subpath] = companion ?? target;
  }
  return changed ? redirected : subpaths;
}

/**
 * `target` with each `./X.svelte` leaf falling back to `./X.svelte.ts`, or
 * `null` when some leaf is not one. A bare specifier is left to TypeScript's
 * package resolution, which appends `.ts` itself.
 */
function toCompanionTarget(target: unknown): SubpathTarget | null {
  return mapTargetLeaves(target, (leaf) =>
    isRelative(leaf) && leaf.endsWith(".svelte")
      ? withCompanionFallback(leaf)
      : null,
  );
}

/**
 * TypeScript tries each entry of a fallback array in turn, so the original
 * `./X.svelte` keeps a real `X.d.svelte.ts` ahead of the companion.
 */
function withCompanionFallback(svelteTarget: string): string[] {
  return [svelteTarget, `${svelteTarget}.ts`];
}

function isRelative(target: string): boolean {
  return target.startsWith("./");
}

/** `target` with each string leaf mapped, or `null` when any leaf maps to `null`. */
function mapTargetLeaves(
  target: unknown,
  mapLeaf: (leaf: string) => SubpathTarget | null,
): SubpathTarget | null {
  if (typeof target === "string") return mapLeaf(target);
  if (Array.isArray(target)) {
    const mapped: SubpathTarget[] = [];
    for (const fallback of target) {
      const mappedFallback = mapTargetLeaves(fallback, mapLeaf);
      if (mappedFallback === null) return null;
      if (Array.isArray(mappedFallback)) mapped.push(...mappedFallback);
      else mapped.push(mappedFallback);
    }
    return mapped;
  }
  if (!isRecord(target)) return null;
  const mapped: Record<string, SubpathTarget> = {};
  for (const [condition, conditionTarget] of Object.entries(target)) {
    const mappedTarget = mapTargetLeaves(conditionTarget, mapLeaf);
    if (mappedTarget === null) return null;
    mapped[condition] = mappedTarget;
  }
  return mapped;
}

let caseSensitiveFileSystem: boolean | undefined,
  // `useCaseSensitiveFileNames` of the first patched `ts.sys`.
  tsCaseSensitiveFileNames: boolean | undefined;

/**
 * What typescript-eslint uses to key paths: the patched `ts.sys`'s
 * `useCaseSensitiveFileNames`. Before any `ts.sys` is patched, the same check
 * TypeScript does, on this file instead of `typescript.js`.
 */
function isFileSystemCaseSensitive(): boolean {
  if (tsCaseSensitiveFileNames !== undefined) return tsCaseSensitiveFileNames;
  if (caseSensitiveFileSystem !== undefined) return caseSensitiveFileSystem;
  if (process.platform === "win32") return (caseSensitiveFileSystem = false);
  const file = fileURLToPath(import.meta.url);
  const swapped = file.replace(/\w/gu, (ch) =>
    ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase(),
  );
  caseSensitiveFileSystem = swapped === file || !fs.existsSync(swapped);
  return caseSensitiveFileSystem;
}

/**
 * The key for a path in `translations` and `servedCompanions`.
 * typescript-eslint lower-cases paths on case-insensitive file systems before
 * they reach `ts.sys.readFile`, but a parse gets the path as given. Both must
 * find the same entry, or `ts.sys.readFile` misses the latest parse.
 */
function fileKey(filePath: string): string {
  const resolved = path.resolve(filePath);
  return isFileSystemCaseSensitive() ? resolved : resolved.toLowerCase();
}

/**
 * The companion TypeScript has read for `sveltePath`, with its current virtual
 * code, or `null` when nothing needs a refresh.
 *
 * typescript-eslint only tells TypeScript about changes to the file being
 * linted. Linting `X.svelte` updates `X.svelte` in the program, but importers
 * resolve `./X.svelte` to the separate `X.svelte.ts` companion, which keeps
 * its old content. Parsing the companion path with this code makes
 * typescript-eslint update it the same way as a linted file.
 */
export function getCompanionToRefresh(
  sveltePath: string,
): { filePath: string; code: string } | null {
  if (!installed) return null;
  const key = fileKey(sveltePath);
  const served = servedCompanions.get(key);
  if (!served) return null;
  const companionPath = `${sveltePath}.ts`;
  if (realFileExists(companionPath)) return null;
  const code = translateOnDemand(sveltePath);
  // Every reader already has this code, as in a CLI run. A refresh would
  // only make typescript-eslint update its programs for nothing.
  if (code === null || (served.size === 1 && served.has(code))) return null;
  return { filePath: companionPath, code };
}

/** Record that a refresh gave `code` for the companion of `sveltePath` to every reader. */
export function rememberServedCompanion(
  sveltePath: string,
  code: string,
): void {
  servedCompanions.set(fileKey(sveltePath), new Set([code]));
}

/**
 * Re-read the companion in every project service that holds it.
 *
 * typescript-eslint's project service does not watch the disk, and only the
 * linted file is opened with new content. The companion is never opened, so
 * it is reloaded through the hooked `ts.sys.readFile` instead. Opening it as
 * a client file would move it out of the configured project.
 */
export function reloadCompanionInProjectServices(companionPath: string): void {
  for (const service of projectServices) {
    const info = service.getScriptInfo(companionPath);
    if (!info || info.isScriptOpen?.()) continue;
    info.reloadFromFile?.();
  }
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
      `imports of '${path.basename(sveltePath)}' to the module, so component ` +
      "prop types are not available for this component. The lint rule " +
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

/** Fallback options for translations requested before the first `.svelte` parse. */
function getFallbackParserOptions(): NormalizedParserOptions | null {
  if (fallbackParserOptions !== undefined) return fallbackParserOptions;
  try {
    fallbackParserOptions = normalizeParserOptions({
      parser: loadNewestModule("@typescript-eslint/parser"),
    });
  } catch {
    fallbackParserOptions = null;
  }
  return fallbackParserOptions;
}

function translateOnDemand(filePath: string): string | null {
  const parserOptions = activeParserOptions ?? getFallbackParserOptions();
  if (!parserOptions) return null;
  const provisional = activeParserOptions === null;

  const mtimeMs = statMtimeMs(filePath);
  if (mtimeMs === null) return null;

  const key = fileKey(filePath);
  const cached = translations.get(key);
  if (cached && cached.mtimeMs === mtimeMs) return cached.virtualCode;

  const svelteSource = readUtf8(filePath);
  if (svelteSource === null) {
    translations.set(key, { mtimeMs, virtualCode: null, provisional });
    return null;
  }

  const virtualCode = svelteToVirtualTypeScript(
    filePath,
    svelteSource,
    parserOptions,
  );
  // Store the outcome — including `null` — to negative-cache failed translations.
  translations.set(key, { mtimeMs, virtualCode, provisional });
  return virtualCode;
}

function patchTsSys(sys: TsLike["sys"]): void {
  if (!sys || typeof sys.readFile !== "function") return;
  if (patchedSysObjects.has(sys)) return;
  patchedSysObjects.add(sys);
  if (typeof sys.useCaseSensitiveFileNames === "boolean") {
    tsCaseSensitiveFileNames ??= sys.useCaseSensitiveFileNames;
  }
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
          const key = fileKey(filePath.slice(0, -".ts".length));
          const served = servedCompanions.get(key);
          if (served) served.add(virtual);
          else servedCompanions.set(key, new Set([virtual]));
          return virtual;
        }
      } else if (path.basename(filePath) === "package.json") {
        // This is also what `import pkg from "./package.json"` sees under
        // `resolveJsonModule`, so its type gains the added entries. Harmless.
        const packageJsonText = originalReadFile(filePath, encoding);
        return packageJsonText === undefined
          ? undefined
          : redirectSvelteSubpathTargets(packageJsonText);
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

  // A virtual companion is not on disk, so the real `realpath` returns it
  // unchanged, e.g. still under a workspace symlink in `node_modules`. Resolve
  // it through its `X.svelte` instead, so the program holds the same path that
  // ESLint lints and the hook caches.
  if (typeof sys.realpath === "function") {
    const originalRealpath = sys.realpath.bind(sys);
    sys.realpath = (filePath: string) => {
      if (
        typeof filePath === "string" &&
        filePath.endsWith(SVELTE_COMPANION_SUFFIX) &&
        !realFileExists(filePath)
      ) {
        const sveltePath = filePath.slice(0, -".ts".length);
        if (realFileExists(sveltePath)) {
          return `${originalRealpath(sveltePath)}.ts`;
        }
      }
      return originalRealpath(filePath);
    };
  }
}

function patchProjectService(proto: ProjectServiceLike | undefined): void {
  if (!proto || typeof proto.openClientFile !== "function") return;
  if (patchedProjectServicePrototypes.has(proto)) return;
  patchedProjectServicePrototypes.add(proto);

  const originalOpenClientFile = proto.openClientFile;
  proto.openClientFile = function (
    this: ProjectServiceLike,
    ...args: unknown[]
  ) {
    projectServices.add(this);
    return originalOpenClientFile.apply(this, args);
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
  } catch (e) {
    warn(
      `failed to load 'typescript' from the project: ${
        e instanceof Error ? e.message : String(e)
      }. The hook has nothing to patch.`,
    );
  }
}

/** Patch every `typescript.js` and `tsserverlibrary.js` already in `require.cache`. */
function patchAllLoadedTypeScripts(): void {
  const cache = createRequire(import.meta.url).cache as
    | Record<string, { exports?: TsLike } | undefined>
    | undefined;
  if (!cache) return;
  for (const [resolvedPath, mod] of Object.entries(cache)) {
    if (
      resolvedPath.includes(`${path.sep}typescript${path.sep}`) &&
      (resolvedPath.endsWith(`${path.sep}typescript.js`) ||
        resolvedPath.endsWith(`${path.sep}tsserverlibrary.js`))
    ) {
      patchTsSys(mod?.exports?.sys);
      patchProjectService(mod?.exports?.server?.ProjectService?.prototype);
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
  servedCompanions.clear();
  projectServices.clear();
  activeParserOptions = null;
  fallbackParserOptions = undefined;
  needsParseTimeRescan = false;
  // Re-arm the once-per-process warning so tests don't depend on suite order.
  companionConflictWarned = false;
}

/** Test seam: patch a caller-supplied `sys` instead of the require.cache ones. */
export function _patchTsSysForTesting(sys: TsLike["sys"]): void {
  patchTsSys(sys);
}
