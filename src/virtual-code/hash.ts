import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import lockfile from "proper-lockfile";

const HASH_MAP_FILENAME = ".hashmap.json";
const LOCK_FILE = ".hashmap.lock";
const HASH_MAP_VERSION = "1.0.0";

interface HashMapData {
  version: string;
  parserVersion: string;
  files: Record<string, string>;
}

/**
 * Generate a SHA-256 hash of the content.
 */
export function generateHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Load the hash map from the cache directory.
 * Returns an empty map if the file doesn't exist or is invalid.
 */
export function loadHashMap(
  cacheDir: string,
  parserVersion: string,
): Map<string, string> {
  const hashMapPath = path.join(cacheDir, HASH_MAP_FILENAME);

  try {
    if (!fs.existsSync(hashMapPath)) {
      return new Map();
    }

    const data = JSON.parse(
      fs.readFileSync(hashMapPath, "utf-8"),
    ) as HashMapData;

    // Invalidate cache if version mismatch
    if (
      data.version !== HASH_MAP_VERSION ||
      data.parserVersion !== parserVersion
    ) {
      return new Map();
    }

    return new Map(Object.entries(data.files));
  } catch {
    // Return empty map on any error
    return new Map();
  }
}

/**
 * Try to acquire lock with manual retry logic for sync API.
 */
function tryAcquireLock(
  lockFilePath: string,
  maxRetries: number,
  retryDelay: number,
): (() => void) | null {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return lockfile.lockSync(lockFilePath, {
        stale: 30000, // Consider lock stale after 30 seconds
      });
    } catch (e) {
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        e.code === "ELOCKED" &&
        i < maxRetries - 1
      ) {
        // Wait before retrying (blocking sleep using Atomics)
        const waitMs = retryDelay * Math.pow(2, i);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
        continue;
      }
      throw e;
    }
  }
  return null;
}

/**
 * Save the hash map to the cache directory.
 * Uses file locking to prevent race conditions when multiple processes
 * are running concurrently (e.g., ESLint with --concurrency auto).
 */
export function saveHashMap(
  cacheDir: string,
  hashMap: Map<string, string>,
  parserVersion: string,
): void {
  const hashMapPath = path.join(cacheDir, HASH_MAP_FILENAME);
  const lockFilePath = path.join(cacheDir, LOCK_FILE);

  try {
    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Create lock file if it doesn't exist
    if (!fs.existsSync(lockFilePath)) {
      fs.writeFileSync(lockFilePath, "", "utf-8");
    }

    // Acquire lock with retries
    const release = tryAcquireLock(lockFilePath, 10, 50);
    if (!release) {
      // Could not acquire lock, skip saving
      return;
    }

    try {
      // Read existing hash map and merge with new entries
      // This prevents data loss when multiple processes update different files
      const existingHashMap = loadHashMap(cacheDir, parserVersion);
      for (const [key, value] of hashMap) {
        existingHashMap.set(key, value);
      }

      const data: HashMapData = {
        version: HASH_MAP_VERSION,
        parserVersion,
        files: Object.fromEntries(existingHashMap),
      };

      fs.writeFileSync(hashMapPath, JSON.stringify(data, null, 2), "utf-8");
    } finally {
      release();
    }
  } catch {
    // Silently ignore lock/write errors
  }
}
