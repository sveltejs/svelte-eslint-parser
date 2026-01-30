import fs from "fs";
import path from "path";
import ts from "typescript";

export interface TsConfigInfo {
  /** Base URL for path resolution (absolute path, defaults to tsconfig directory) */
  baseUrl: string;
  /** Path aliases (e.g., { "$lib/*": ["src/lib/*"] }) */
  paths: Record<string, string[]> | null;
  /** Full compiler options for module resolution */
  compilerOptions: ts.CompilerOptions;
}

/**
 * Find the tsconfig file that actually defines the paths option.
 * Walks the extends chain to find where paths is defined.
 */
function findPathsDefiningTsconfig(tsconfigPath: string): string {
  const absolutePath = path.resolve(tsconfigPath);

  try {
    const content = fs.readFileSync(absolutePath, "utf-8");
    const config = JSON.parse(content);

    // If this config has paths defined, return this path
    if (config.compilerOptions?.paths) {
      return absolutePath;
    }

    // If there's an extends, follow it
    if (config.extends) {
      const extendsPath = path.resolve(
        path.dirname(absolutePath),
        config.extends,
      );
      return findPathsDefiningTsconfig(extendsPath);
    }
  } catch {
    // Ignore errors, return original
  }

  return absolutePath;
}

/**
 * Read and parse a tsconfig file, resolving all extends chains.
 * Uses TypeScript's API to properly resolve the configuration.
 */
export function readTsConfigWithExtends(
  tsconfigPath: string,
): TsConfigInfo | null {
  try {
    const configFile = ts.readConfigFile(tsconfigPath, (filePath) =>
      ts.sys.readFile(filePath),
    );

    if (configFile.error) {
      return null;
    }

    const configDir = path.dirname(path.resolve(tsconfigPath));
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      configDir,
    );

    // Find the tsconfig that actually defines paths
    // This is important because paths are relative to where they're defined
    const pathsDefiningTsconfig = findPathsDefiningTsconfig(tsconfigPath);
    const pathsBaseDir = path.dirname(pathsDefiningTsconfig);

    // If baseUrl is explicitly set, use it. Otherwise use the directory
    // where paths are defined (which may be in an extended config)
    const baseUrl = parsed.options.baseUrl ?? pathsBaseDir;

    return {
      baseUrl,
      paths: (parsed.options.paths as Record<string, string[]>) ?? null,
      compilerOptions: parsed.options,
    };
  } catch {
    return null;
  }
}
