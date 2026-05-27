import fs from "fs";
import path from "path";

/**
 * Directories that should never be scanned for .svelte files.
 *
 * We intentionally do NOT honor `.gitignore` here. Generated svelte files
 * (e.g., test fixtures, codegen output) are often listed in `.gitignore`
 * but are still linted by ESLint and type-checked by TypeScript, so they
 * must be pre-processed into virtual files; otherwise each lint invocation
 * lazily writes a new virtual file, which forces TypeScript's projectService
 * to invalidate and re-resolve the program for every file — the dominant
 * cause of the cold-cache slowdown this cache exists to eliminate.
 */
const ALWAYS_EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".svelte-eslint-parser",
  ".svelte-kit",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  ".vercel",
  ".netlify",
  ".output",
  ".parcel-cache",
  "dist",
  "build",
  "out",
  "coverage",
  ".nyc_output",
  ".idea",
  ".vscode-test",
]);

/**
 * Scan for all .svelte files in the project root.
 * Excludes a fixed list of build/cache directories. `.gitignore` is intentionally not consulted.
 */
export function scanSvelteFiles(projectRoot: string): string[] {
  const svelteFiles: string[] = [];

  function scanDirectory(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (
          ALWAYS_EXCLUDED_DIRS.has(entry.name) ||
          entry.name.startsWith(".")
        ) {
          continue;
        }
        scanDirectory(path.join(dir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith(".svelte")) {
        svelteFiles.push(path.join(dir, entry.name));
      }
    }
  }

  scanDirectory(projectRoot);
  return svelteFiles;
}
