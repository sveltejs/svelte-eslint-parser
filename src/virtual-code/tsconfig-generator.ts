import fs from "fs";
import path from "path";
import { readTsConfigWithExtends } from "./tsconfig-reader.js";

const GENERATED_TSCONFIG_FILENAME = "tsconfig.json";

interface GeneratedTsConfig {
  extends: string;
  include: string[];
  compilerOptions: {
    rootDirs: string[];
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
}

/**
 * Generate tsconfig.generated.json that extends the original tsconfig
 * and includes the virtual .svelte.ts files.
 */
export function generateTsconfig(
  projectRoot: string,
  cacheDir: string,
  originalTsconfigPath: string | null,
): string {
  const generatedPath = path.join(cacheDir, GENERATED_TSCONFIG_FILENAME);

  // Calculate relative path from cache directory to project root
  const relativeToRoot = path.relative(cacheDir, projectRoot);

  // Calculate relative path to original tsconfig
  let extendsPath: string;
  if (originalTsconfigPath) {
    extendsPath = path.relative(cacheDir, originalTsconfigPath);
  } else {
    // Default to tsconfig.json in project root
    extendsPath = path.join(relativeToRoot, "tsconfig.json");
  }

  // Build rootDirs array
  const rootDirs = [".", relativeToRoot];

  // Check if .svelte-kit/types exists (SvelteKit project)
  const svelteKitTypesDir = path.join(projectRoot, ".svelte-kit", "types");
  if (fs.existsSync(svelteKitTypesDir)) {
    rootDirs.push(path.relative(cacheDir, svelteKitTypesDir));
  }

  const config: GeneratedTsConfig = {
    extends: extendsPath,
    include: [
      `${relativeToRoot}/**/*.ts`,
      `${relativeToRoot}/**/*.js`,
      "./**/*.svelte.__virtual__.ts",
    ],
    compilerOptions: {
      // rootDirs allows TypeScript to treat multiple directories as a single root.
      // This makes relative imports in virtual files resolve correctly to the project root.
      // e.g., from .svelte-eslint-parser/src/lib/Button.svelte.ts,
      //       import '../utils' resolves to src/lib/utils (not .svelte-eslint-parser/src/lib/utils)
      rootDirs,
    },
  };

  // Read original tsconfig to handle path aliases (resolving extends chain)
  if (originalTsconfigPath) {
    const tsConfigInfo = readTsConfigWithExtends(originalTsconfigPath);
    if (tsConfigInfo) {
      const { baseUrl, paths } = tsConfigInfo;

      // Set baseUrl to cache directory so that path aliases can resolve
      // to both the virtual .svelte.ts files in the cache directory
      // and the original files in the project root.
      config.compilerOptions.baseUrl = ".";

      // Adjust paths to look in both cache directory and project root
      // This allows:
      // - $lib/Component.svelte.ts -> cache/src/lib/Component.svelte.ts
      // - $lib/utils.ts -> project/src/lib/utils.ts
      if (paths) {
        const adjustedPaths: Record<string, string[]> = {};
        // baseUrl from TypeScript API is already absolute
        const absoluteBaseUrl = baseUrl ?? path.dirname(originalTsconfigPath);
        const relativeBaseUrlFromCache = path.relative(
          cacheDir,
          absoluteBaseUrl,
        );

        for (const [key, values] of Object.entries(paths)) {
          // First, look in the cache directory (for .svelte.ts files)
          // Then, look in the project root (for other files)
          adjustedPaths[key] = [
            // Cache directory paths (same relative structure)
            ...values,
            // Project root paths (relative from cache directory)
            ...values.map((v) => path.join(relativeBaseUrlFromCache, v)),
          ];
        }
        config.compilerOptions.paths = adjustedPaths;
      }
    }
  }

  try {
    fs.writeFileSync(generatedPath, JSON.stringify(config, null, 2), "utf-8");
  } catch {
    // Silently ignore write errors
  }

  return generatedPath;
}

/**
 * Get the path to the generated tsconfig file.
 */
export function getGeneratedTsconfigPath(cacheDir: string): string {
  return path.join(cacheDir, GENERATED_TSCONFIG_FILENAME);
}
