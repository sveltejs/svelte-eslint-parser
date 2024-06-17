import path from "path";
import fs from "fs";
import { parseConfig } from "./parser";
import type * as Compiler from "svelte/compiler";

export type SvelteConfig = {
  compilerOptions?: Compiler.CompileOptions;
  extensions?: string[];
  kit?: KitConfig;
  preprocess?: unknown;
  vitePlugin?: unknown;
  onwarn?: (
    warning: Compiler.Warning,
    defaultHandler: (warning: Compiler.Warning) => void,
  ) => void;
  [key: string]: unknown;
};

interface KitConfig {
  adapter?: unknown;
  alias?: Record<string, string>;
  appDir?: string;
  csp?: {
    mode?: "hash" | "nonce" | "auto";
    directives?: unknown;
    reportOnly?: unknown;
  };
  csrf?: {
    checkOrigin?: boolean;
  };
  embedded?: boolean;
  env?: {
    dir?: string;
    publicPrefix?: string;
    privatePrefix?: string;
  };
  files?: {
    assets?: string;
    hooks?: {
      client?: string;
      server?: string;
      universal?: string;
    };
    lib?: string;
    params?: string;
    routes?: string;
    serviceWorker?: string;
    appTemplate?: string;
    errorTemplate?: string;
  };
  inlineStyleThreshold?: number;
  moduleExtensions?: string[];
  outDir?: string;
  output?: {
    preloadStrategy?: "modulepreload" | "preload-js" | "preload-mjs";
  };
  paths?: {
    assets?: "" | `http://${string}` | `https://${string}`;
    base?: "" | `/${string}`;
    relative?: boolean;
  };
  prerender?: {
    concurrency?: number;
    crawl?: boolean;
    entries?: ("*" | `/${string}`)[];
    handleHttpError?: unknown;
    handleMissingId?: unknown;
    handleEntryGeneratorMismatch?: unknown;
    origin?: string;
  };
  serviceWorker?: {
    register?: boolean;
    files?(filepath: string): boolean;
  };
  typescript?: {
    config?: (config: Record<string, any>) => Record<string, any> | void;
  };
  version?: {
    name?: string;
    pollInterval?: number;
  };
}

const caches = new Map<string, SvelteConfig | null>();

/**
 * Resolves svelte.config.
 */
export function resolveSvelteConfigFromOption(
  options: any,
): SvelteConfig | null {
  if (options?.svelteConfig) {
    return options.svelteConfig;
  }
  return resolveSvelteConfig(options?.filePath);
}

/**
 * Resolves `svelte.config.js`.
 * It searches the parent directories of the given file to find `svelte.config.js`,
 * and returns the static analysis result for it.
 */
function resolveSvelteConfig(
  filePath: string | undefined,
): SvelteConfig | null {
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
  caches.set(configFilePath, config);
  return config;
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
