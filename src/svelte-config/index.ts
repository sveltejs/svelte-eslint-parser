import path from "path";
import fs from "fs";
import { parseConfig } from "./parser";

/** The result of static analysis of `svelte.config.js`. */
export type StaticSvelteConfig = {
  compilerOptions?: {
    runes?: boolean;
  };
  kit?: {
    files?: {
      routes?: string;
    };
  };
};
export type StaticSvelteConfigFile = {
  filePath: string;
  config: StaticSvelteConfig;
};

const caches = new Map<string, StaticSvelteConfigFile | null>();

/**
 * Resolves svelte.config.js.
 * It searches the parent directories of the given file to find svelte.config.js,
 * and returns the static analysis result for it.
 */
export function resolveSvelteConfig(
  filePath: string | undefined,
): StaticSvelteConfigFile | null {
  const cwd =
    filePath && fs.existsSync(filePath)
      ? path.dirname(filePath)
      : process.cwd();
  const configFilePath = findConfigFilePath(cwd);
  if (!configFilePath) return null;

  if (caches.has(configFilePath)) {
    return caches.get(configFilePath) || null;
  }

  const code = fs.readFileSync(configFilePath, "utf8");
  const config = parseConfig(code);
  const result: StaticSvelteConfigFile | null = config
    ? { config, filePath: configFilePath }
    : null;
  caches.set(configFilePath, result);
  return result;
}

/**
 * Searches from the current working directory up until finding the config filename.
 * @param {string} cwd The current working directory to search from.
 * @returns {string|undefined} The file if found or `undefined` if not.
 */
function findConfigFilePath(cwd: string) {
  let directory = path.resolve(cwd);
  const { root } = path.parse(directory);
  const stopAt = path.resolve(directory, root);
  while (directory !== stopAt) {
    const target = path.resolve(directory, "svelte.config.js");
    const stat = fs.existsSync(target)
      ? fs.statSync(target, {
          throwIfNoEntry: false,
        })
      : null;
    if (stat?.isFile()) {
      return target;
    }
    directory = path.dirname(directory);
  }
  return null;
}
