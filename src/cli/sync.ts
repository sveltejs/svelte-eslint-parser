import path from "path";
import fs from "fs";
import { createRequire } from "module";
import {
  getVirtualCodeCacheManager,
  resetVirtualCodeCacheManager,
} from "../virtual-code/index.js";
import { initializeVirtualCodeCache } from "../parser/virtual-code-initializer.js";
import { normalizeParserOptions } from "../parser/parser-options.js";

export interface SyncOptions {
  /** Working directory to scan. Defaults to process.cwd(). */
  cwd?: string;
  /**
   * Path to the project's tsconfig.json. If omitted, the parser walks up from
   * `cwd` looking for `tsconfig.json` next to `package.json`.
   */
  project?: string;
  /**
   * TypeScript-aware ESLint parser used to generate virtual code. Accepts a
   * parser module/object or a module name resolvable from the project.
   * Defaults to "@typescript-eslint/parser".
   */
  parser?: string | object;
}

/**
 * Resolve and require a TypeScript-aware ESLint parser from the project.
 * Returns null if it cannot be resolved.
 */
function resolveTsParser(
  cwd: string,
  parser: SyncOptions["parser"],
): string | object | null {
  if (parser && typeof parser !== "string") {
    return parser;
  }
  const name =
    typeof parser === "string" ? parser : "@typescript-eslint/parser";
  try {
    const req = createRequire(path.join(cwd, "package.json"));
    return req(name) as object;
  } catch {
    // Fall back to the bare name so the cache manager can attempt its own
    // resolution. Virtual-code generation will skip files we cannot parse,
    // but the cache directory and tsconfig.generated.json still get created.
    return name;
  }
}

/**
 * Programmatic entry point for the `svelte-eslint-parser-sync` CLI.
 *
 * Pre-generates the virtual code cache (`.svelte-eslint-parser/`) for every
 * `.svelte` file in the project. Subsequent ESLint runs configured with
 * `svelteFeatures.experimentalVirtualCodeMode: "prepared"` read these files
 * without scanning or writing, so concurrent workers don't race or duplicate
 * work.
 */
export function syncVirtualCode(options: SyncOptions = {}): {
  projectRoot: string | null;
  cacheDir: string | null;
} {
  const cwd = path.resolve(options.cwd ?? process.cwd());

  // findProjectRoot expects an existing file or directory. Resolve a stable
  // starting point: a `package.json` if present (it always exists at the
  // project root we want), otherwise the cwd itself.
  const packageJsonPath = path.join(cwd, "package.json");
  const startPath = fs.existsSync(packageJsonPath) ? packageJsonPath : cwd;

  resetVirtualCodeCacheManager();

  const resolvedParser = resolveTsParser(cwd, options.parser);

  const parserOptions = normalizeParserOptions({
    filePath: startPath,
    project: options.project ?? path.join(cwd, "tsconfig.json"),
    parser: resolvedParser ?? undefined,
    svelteFeatures: {
      experimentalGenerateVirtualCodeCache: true,
    },
  });

  initializeVirtualCodeCache(startPath, parserOptions);

  const cacheManager = getVirtualCodeCacheManager();
  return {
    projectRoot: cacheManager.getProjectRoot(),
    cacheDir: cacheManager.isInitialized()
      ? cacheManager.getGeneratedTsconfigPath()
        ? path.dirname(cacheManager.getGeneratedTsconfigPath()!)
        : null
      : null,
  };
}
