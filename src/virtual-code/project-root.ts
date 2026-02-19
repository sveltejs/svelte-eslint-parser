import fs from "fs";
import path from "path";

const CACHE_DIR_NAME = ".svelte-eslint-parser";

/**
 * Find the project root by searching for package.json.
 * Starts from the given path and traverses upward.
 */
export function findProjectRoot(startPath: string): string | null {
  let currentPath = path.resolve(startPath);

  // If startPath is a file, start from its directory
  try {
    if (fs.statSync(currentPath).isFile()) {
      currentPath = path.dirname(currentPath);
    }
  } catch {
    // If stat fails, assume it's a directory path
    currentPath = path.dirname(currentPath);
  }

  while (currentPath) {
    const packageJsonPath = path.join(currentPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      // Reached the root of the filesystem
      break;
    }
    currentPath = parentPath;
  }

  return null;
}

/**
 * Get the cache directory path for the given project root.
 */
export function getCacheDirectory(projectRoot: string): string {
  return path.join(projectRoot, CACHE_DIR_NAME);
}
