import path from "path";
import fs from "fs";
import { parseConfig, parseViteConfig } from "./parser.js";
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
  warningFilter?: (warning: Compiler.Warning) => boolean;
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

const VITE_CONFIG_FILE_NAMES = [
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.ts",
  "vite.config.mts",
];

/**
 * Resolves the svelte config.
 * It searches the parent directories of the given file for a vite config that
 * passes options to the `sveltekit()` plugin, or a `svelte.config.js`,
 * and returns the static analysis result for it.
 */
function resolveSvelteConfig(
  filePath: string | undefined,
): SvelteConfig | null {
  let cwd = filePath && fs.existsSync(filePath) ? path.dirname(filePath) : null;
  if (cwd == null) {
    if (typeof process === "undefined") return null;
    cwd = process.cwd();
  }
  let directory = path.resolve(cwd);
  const { root } = path.parse(directory);
  const stopAt = path.resolve(directory, root);
  while (directory !== stopAt) {
    // Options passed to `sveltekit()` win: SvelteKit ignores svelte.config.js when they are set.
    for (const name of VITE_CONFIG_FILE_NAMES) {
      const viteTarget = path.resolve(directory, name);
      if (isFile(viteTarget)) {
        const config = parseWithCache(viteTarget, parseViteConfig);
        if (config) return config;
        break;
      }
    }
    const target = path.resolve(directory, "svelte.config.js");
    if (isFile(target)) {
      return parseWithCache(target, parseConfig);
    }
    const next = path.dirname(directory);
    if (next === directory) break;
    directory = next;
  }
  return null;
}

function parseWithCache(
  filePath: string,
  parse: (code: string) => SvelteConfig | null,
): SvelteConfig | null {
  if (caches.has(filePath)) {
    return caches.get(filePath) || null;
  }
  const code = fs.readFileSync(filePath, "utf8");
  const config = parse(code);
  caches.set(filePath, config);
  return config;
}

function isFile(target: string): boolean {
  const stat = fs.existsSync(target)
    ? fs.statSync(target, {
        throwIfNoEntry: false,
      })
    : null;
  return stat?.isFile() ?? false;
}
