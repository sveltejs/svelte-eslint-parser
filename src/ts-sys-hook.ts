import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import type { NormalizedParserOptions } from "./parser/parser-options.js";
import { svelteToVirtualTypeScript } from "./parser/svelte-to-virtual-ts.js";

/**
 * In-memory bridge that lets TypeScript's projectService type-check Svelte
 * files without any on-disk artifacts.
 *
 * When installed, the hook intercepts `ts.sys.readFile`. For paths ending in
 * `.svelte`, it converts the source to virtual TypeScript on demand and
 * returns that string. Every other read passes through untouched, so
 * ESLint's own file reads still see the original Svelte source.
 *
 * Activation:
 *   `SVELTE_ESLINT_PARSER_TS_SYS_HOOK=1`
 *
 * Notes on positions:
 *   - Type-aware lint of `.svelte` files always works against the parser's
 *     virtual TypeScript shim. `services.getTypeAtLocation(node)` is fine
 *     because the parser restores node positions to the Svelte source,
 *     but rules that read raw TS diagnostics
 *     (`program.getSemanticDiagnostics(sourceFile)` and friends) see
 *     positions inside the shim. The hook does not change this — the
 *     diagnostics would already be in shim coordinates without it, because
 *     TypeScript only ever sees the shim either way. What the hook does
 *     improve is cross-file resolution: a sibling `import './Other.svelte'`
 *     resolves to real virtual TypeScript instead of opaque
 *     `declare module '*.svelte'`.
 *
 * Monorepo notes:
 *   - In layouts that install multiple TypeScript packages without
 *     hoisting, `@typescript-eslint/parser` may resolve a TS instance this
 *     module hasn't patched. The hook patches every TS already in
 *     `require.cache` at install time and re-scans on every parse, but a
 *     freshly imported peer TS between parses may slip through until the
 *     next call.
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

/**
 * Record the parser options ESLint just normalized. Translation needs them
 * (parser, svelteFeatures, sourceType, ecmaVersion, ...); the parse entry
 * point is the only place they flow through.
 */
export function rememberParserOptions(options: NormalizedParserOptions): void {
  activeParserOptions = options;
  // Re-scanning `require.cache` is only safe — and only useful — once the
  // hook is active. Without this guard we would patch every TS instance the
  // moment any Svelte file is parsed, breaking unrelated tooling (e.g. the
  // parser's own `update-fixtures` script, which relies on svelte2tsx's view
  // of `.svelte` files, not ours).
  if (!installed) return;
  // A late-loaded TypeScript instance (think: typescript-eslint resolving a
  // workspace-local TS after we already patched the root's) won't have
  // received the patch yet. Re-scan `require.cache` every parse so the next
  // TS instance to surface gets a chance to be patched.
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
 * Try to resolve and load TypeScript from the user's project so we end up
 * patching the same instance `@typescript-eslint/parser` will later use.
 *
 * Resolution order:
 *   1. `process.cwd()` — where the user runs ESLint from. Matches what
 *      tools resolving "the project's TypeScript" do by convention.
 *   2. The directory containing this module — works when this package and
 *      `typescript` are hoisted together.
 *   3. `import.meta.url` — last-resort relative to our own location.
 */
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

/**
 * Walk Node's `require.cache` looking for any already-loaded TypeScript
 * module and patch its `sys.readFile`. Catches the (uncommon but real) case
 * where typescript-eslint has resolved a TS instance we didn't.
 */
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

/**
 * Install the `ts.sys.readFile` patch. Idempotent. No-op unless
 * `SVELTE_ESLINT_PARSER_TS_SYS_HOOK=1` is set.
 *
 * Two passes: load TypeScript from the user's project explicitly (so it
 * lands in `require.cache` and projectService later finds the patched
 * instance), then walk `require.cache` for any other TS instance that may
 * already be loaded.
 */
export function installTsSysHook(): void {
  if (installed) return;
  // eslint-disable-next-line no-process-env -- intentional opt-in gate
  if (process.env[ENV_FLAG] !== "1") return;

  const ts = loadProjectTypeScript();
  if (ts?.sys) patchTsSys(ts.sys);
  patchAllLoadedTypeScripts();
  installed = true;

  // Surface the experimental status at runtime. `eslint --quiet` does not
  // filter stderr, so users running the hook will see this on every lint.
  process.stderr.write(
    `[svelte-eslint-parser] ${ENV_FLAG}=1 enables an experimental ts.sys.readFile hook. ` +
      `Behaviour and API may change or be removed in any release.\n`,
  );
}

/**
 * Test seam — clears the in-memory translation cache. The `ts.sys` patches
 * themselves are intentionally not removable; restoring would require
 * holding the original references for every TS instance and is unnecessary
 * for our use case (parser-lifetime install).
 */
export function _resetTranslationCacheForTesting(): void {
  translations.clear();
  activeParserOptions = null;
}
