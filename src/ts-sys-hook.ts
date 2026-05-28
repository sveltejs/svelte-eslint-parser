import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import type { NormalizedParserOptions } from "./parser/parser-options.js";
import { generateVirtualCodeForFile } from "./parser/virtual-code-initializer.js";

/**
 * In-memory bridge that lets TypeScript's projectService type-check Svelte
 * files without any on-disk artifacts.
 *
 * When installed, we patch `ts.sys.readFile`. For paths ending in `.svelte`,
 * we translate the source to virtual TypeScript on demand (using the same
 * `analyzeTypeScriptInSvelte` pipeline ESLint already exercises) and return
 * that string. Every other read passes through untouched, so ESLint's own
 * file reads still see the original Svelte source. There is no
 * `.svelte-eslint-parser/` directory, no generated tsconfig, no CLI sync
 * step, and projectService discovers only one program — the user's.
 *
 * Activation: `SVELTE_ESLINT_PARSER_TS_SYS_HOOK=1`.
 */

const ENV_FLAG = "SVELTE_ESLINT_PARSER_TS_SYS_HOOK";

interface CacheEntry {
  mtimeMs: number;
  virtualCode: string;
}

const translationCache = new Map<string, CacheEntry>();
let activeParserOptions: NormalizedParserOptions | null = null;
let installed = false;

/**
 * Record the most recent parser options ESLint passed in. Translation needs
 * the user's parser + svelte settings (e.g. `parser`, `svelteFeatures`,
 * `extraFileExtensions`), and the parse entry point is the only place those
 * options are guaranteed to flow through.
 */
export function rememberParserOptions(options: NormalizedParserOptions): void {
  activeParserOptions = options;
}

function translateSvelteFile(filePath: string): string | null {
  if (!activeParserOptions) return null;

  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
  const cached = translationCache.get(filePath);
  if (cached && cached.mtimeMs === mtimeMs) return cached.virtualCode;

  let svelteSource: string;
  try {
    svelteSource = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  const result = generateVirtualCodeForFile(
    filePath,
    svelteSource,
    activeParserOptions,
  );
  if (!result) return null;

  translationCache.set(filePath, { mtimeMs, virtualCode: result.code });
  return result.code;
}

/**
 * Load the TypeScript module that typescript-eslint will use. We resolve from
 * the user's project so we end up patching the same instance projectService
 * later imports — otherwise our `ts.sys` patch would target a different
 * `require.cache` entry.
 */
function loadTypeScript(): typeof import("typescript") | null {
  const here =
    typeof __dirname !== "undefined"
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), "package.json"),
    path.join(here, "package.json"),
  ];
  for (const from of candidates) {
    try {
      return createRequire(from)("typescript") as typeof import("typescript");
    } catch {
      // try next candidate
    }
  }
  try {
    return createRequire(import.meta.url)(
      "typescript",
    ) as typeof import("typescript");
  } catch {
    return null;
  }
}

/**
 * Install the `ts.sys.readFile` patch. Idempotent. No-op unless the env flag
 * is set or TypeScript cannot be resolved from the project.
 */
export function installTsSysHook(): void {
  if (installed) return;
  if (process.env[ENV_FLAG] !== "1") return;

  const ts = loadTypeScript();
  if (!ts?.sys?.readFile) return;
  installed = true;

  const originalReadFile = ts.sys.readFile.bind(ts.sys);
  ts.sys.readFile = (filePath: string, encoding?: string) => {
    if (typeof filePath === "string" && filePath.endsWith(".svelte")) {
      const virtual = translateSvelteFile(filePath);
      if (virtual !== null) return virtual;
    }
    return originalReadFile(filePath, encoding);
  };
}
