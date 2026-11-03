import path from "path";
import fs from "fs";
import Module from "module";
import { parseConfig, parseViteConfig } from "./parser.js";
import type * as Compiler from "svelte/compiler";

/**
 * The Svelte config.
 * It accepts both the legacy `svelte.config.js` shape (with `kit`)
 * and the SvelteKit 3 flat shape, where the `kit` options are top-level
 * options of the `sveltekit()` Vite plugin.
 */
export type SvelteConfig = KitConfig & {
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

const VITE_CONFIG_FILE_NAMES = [
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.cts",
];

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
 * Resolves the Svelte config by static analysis.
 * It searches the given file's directory and its parents.
 * In each directory, it first reads `vite.config.*`, and uses the argument of
 * the `sveltekit()` or `svelte()` plugin if it can be read.
 * Otherwise, it reads `svelte.config.js` in the same directory.
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
  for (;;) {
    for (const name of VITE_CONFIG_FILE_NAMES) {
      const target = path.join(directory, name);
      if (!isFile(target)) continue;
      const config = withCache(target, () => readViteConfig(target));
      if (config) return config;
    }
    const svelteConfigPath = path.join(directory, "svelte.config.js");
    if (isFile(svelteConfigPath)) {
      return withCache(svelteConfigPath, () => {
        try {
          return parseConfig(fs.readFileSync(svelteConfigPath, "utf8"));
        } catch {
          return null;
        }
      });
    }
    const next = path.dirname(directory);
    if (next === directory) break;
    directory = next;
  }
  return null;
}

function withCache(
  configFilePath: string,
  read: () => SvelteConfig | null,
): SvelteConfig | null {
  if (caches.has(configFilePath)) {
    return caches.get(configFilePath) || null;
  }
  const config = read();
  caches.set(configFilePath, config);
  return config;
}

function isFile(target: string): boolean {
  try {
    return fs.statSync(target, { throwIfNoEntry: false })?.isFile() ?? false;
  } catch {
    return false;
  }
}

/**
 * Reads the Svelte config from `vite.config.*`.
 * Returns `null` if it cannot be read. It never throws.
 */
function readViteConfig(filePath: string): SvelteConfig | null {
  try {
    let code = fs.readFileSync(filePath, "utf8");
    if (/\.[cm]?ts$/u.test(filePath)) {
      const stripped = stripTypeScriptTypes(code);
      if (stripped != null) code = stripped;
    }
    return parseViteConfig(code);
  } catch {
    return null;
  }
}

/**
 * Removes TypeScript types with `module.stripTypeScriptTypes()` (Node.js 22.13+).
 * Returns `null` if it is not available or fails.
 */
export function stripTypeScriptTypes(code: string): string | null {
  const strip = (Module as any)?.stripTypeScriptTypes as
    | ((code: string, options?: { mode?: "strip" }) => string)
    | undefined;
  if (typeof strip !== "function") return null;
  // Some Node.js versions emit an ExperimentalWarning on the first call.
  // Hide it, since the user did not ask for this feature.
  const originalEmitWarning: (...args: any[]) => void =
    // eslint-disable-next-line @typescript-eslint/unbound-method -- restored below
    process.emitWarning;
  process.emitWarning = ((warning: any, ...args: any[]): void => {
    const type =
      typeof args[0] === "string"
        ? args[0]
        : (args[0] as { type?: string } | undefined)?.type;
    if (
      type === "ExperimentalWarning" ||
      (typeof warning === "object" && warning?.name === "ExperimentalWarning")
    ) {
      return;
    }
    originalEmitWarning.call(process, warning, ...args);
  }) as typeof process.emitWarning;
  try {
    return strip(code, { mode: "strip" });
  } catch {
    return null;
  } finally {
    process.emitWarning = originalEmitWarning;
  }
}
