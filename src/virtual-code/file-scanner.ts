import fs from "fs";
import path from "path";

/**
 * Non-dot directories never scanned for `.svelte` files. Dot-prefixed
 * directories (`.git`, `.svelte-kit`, `.next`, etc.) are excluded by the
 * `startsWith(".")` rule below; they don't need to be listed here.
 *
 * `.gitignore` is intentionally NOT consulted: generated `.svelte` files
 * (test fixtures, codegen output) are routinely gitignored yet still linted
 * and type-checked, so they must be pre-processed into virtual files.
 * Otherwise each lint invocation writes a new virtual file lazily, forcing
 * TypeScript's projectService to re-resolve the program on every file —
 * defeating the cache this module exists to provide.
 */
const EXCLUDED_BUILD_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
]);

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
        if (entry.name.startsWith(".") || EXCLUDED_BUILD_DIRS.has(entry.name)) {
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
