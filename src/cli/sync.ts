import path from "path";
import fs from "fs";
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

  const parserOptions = normalizeParserOptions({
    filePath: startPath,
    project: options.project ?? path.join(cwd, "tsconfig.json"),
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
