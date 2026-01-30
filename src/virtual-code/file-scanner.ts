import fs from "fs";
import path from "path";
import ignore, { type Ignore } from "ignore";

/** Directories that should always be excluded, regardless of .gitignore */
const ALWAYS_EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".svelte-eslint-parser",
]);

/**
 * Load and parse .gitignore file from the project root.
 * Returns an ignore instance with the patterns loaded.
 */
function loadGitignore(projectRoot: string): Ignore {
  const ig = ignore();

  const gitignorePath = path.join(projectRoot, ".gitignore");
  try {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    ig.add(content);
  } catch {
    // .gitignore doesn't exist or can't be read, use empty patterns
  }

  return ig;
}

/**
 * Scan for all .svelte files in the project root.
 * Excludes files matching .gitignore patterns and common build directories.
 */
export function scanSvelteFiles(projectRoot: string): string[] {
  const svelteFiles: string[] = [];
  const ig = loadGitignore(projectRoot);

  function scanDirectory(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      // Skip directories that can't be read
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(projectRoot, fullPath);

      if (entry.isDirectory()) {
        // Always exclude certain directories
        if (ALWAYS_EXCLUDED_DIRS.has(entry.name)) {
          continue;
        }

        // Check if directory is ignored by .gitignore
        // Add trailing slash to indicate it's a directory
        if (ig.ignores(`${relativePath}/`)) {
          continue;
        }

        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".svelte")) {
        // Check if file is ignored by .gitignore
        if (!ig.ignores(relativePath)) {
          svelteFiles.push(fullPath);
        }
      }
    }
  }

  scanDirectory(projectRoot);
  return svelteFiles;
}
