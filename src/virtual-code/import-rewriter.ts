import fs from "fs";
import path from "path";
import ts from "typescript";
import type { SvelteImportInfo } from "../parser/typescript/context.js";

export interface ImportRewriterContext {
  /** The virtual file path (e.g., .svelte-eslint-parser/src/App.svelte.__virtual__.ts) */
  virtualFilePath: string;
  /** The cache directory (e.g., /project/.svelte-eslint-parser) */
  cacheDir: string;
  /** The project root (e.g., /project) */
  projectRoot: string;
  /** Path aliases from tsconfig (e.g., { "$lib/*": ["src/lib/*"] }) */
  pathAliases: Record<string, string[]> | null;
  /** Base URL from tsconfig */
  baseUrl: string | null;
  /** Full compiler options for module resolution */
  compilerOptions: ts.CompilerOptions | null;
}

/**
 * Rewrite import paths using AST-extracted positions.
 * This is more accurate than regex-based rewriting as it uses positions
 * extracted during AST parsing.
 */
export function rewriteImportPathsWithPositions(
  code: string,
  svelteImports: SvelteImportInfo[],
  context: ImportRewriterContext | null,
): string {
  if (!context || svelteImports.length === 0) {
    return code;
  }

  const { virtualFilePath, cacheDir, projectRoot, compilerOptions, baseUrl } =
    context;
  const virtualFileDir = path.dirname(virtualFilePath);

  // Process replacements in reverse order to maintain positions
  const sortedImports = [...svelteImports].sort((a, b) => b.start - a.start);

  let result = code;
  for (const importInfo of sortedImports) {
    const rewritten = rewriteSvelteImport(
      importInfo.importPath,
      virtualFileDir,
      cacheDir,
      projectRoot,
      compilerOptions,
      baseUrl,
    );

    if (rewritten !== importInfo.importPath) {
      result =
        result.slice(0, importInfo.start) +
        rewritten +
        result.slice(importInfo.end);
    }
  }

  return result;
}

/**
 * Rewrite import paths in virtual TypeScript code.
 * Converts .svelte imports to point to .svelte.d.ts files in the cache directory.
 */
export function rewriteImportPaths(
  code: string,
  context: ImportRewriterContext | null,
): string {
  if (!context) {
    return code;
  }

  const { virtualFilePath, cacheDir, projectRoot, compilerOptions, baseUrl } =
    context;
  const virtualFileDir = path.dirname(virtualFilePath);

  let result = code;

  // Pattern 1: from '...svelte' or '...svelte.ts' or '...svelte.js'
  result = result.replace(
    /(\bfrom\s*)(["'])([^"']+\.svelte(?:\.(?:ts|js))?)\2/g,
    (_match, from, quote, importPath) => {
      const rewritten = rewriteSvelteImport(
        importPath,
        virtualFileDir,
        cacheDir,
        projectRoot,
        compilerOptions,
        baseUrl,
      );
      return `${from}${quote}${rewritten}${quote}`;
    },
  );

  // Pattern 2: import('...svelte') or import('...svelte.ts') or import('...svelte.js')
  result = result.replace(
    /(\bimport\s*\(\s*)(["'])([^"']+\.svelte(?:\.(?:ts|js))?)\2(\s*\))/g,
    (_match, prefix, quote, importPath, suffix) => {
      const rewritten = rewriteSvelteImport(
        importPath,
        virtualFileDir,
        cacheDir,
        projectRoot,
        compilerOptions,
        baseUrl,
      );
      return `${prefix}${quote}${rewritten}${quote}${suffix}`;
    },
  );

  // Pattern 3: import '...svelte' or '...svelte.ts' or '...svelte.js' (side-effect imports)
  result = result.replace(
    /(\bimport\s*)(["'])([^"']+\.svelte(?:\.(?:ts|js))?)\2(?=\s*[\n;]|$)/g,
    (_match, prefix, quote, importPath) => {
      const rewritten = rewriteSvelteImport(
        importPath,
        virtualFileDir,
        cacheDir,
        projectRoot,
        compilerOptions,
        baseUrl,
      );
      return `${prefix}${quote}${rewritten}${quote}`;
    },
  );

  return result;
}

/**
 * Rewrite a single .svelte import path to point to the .d.ts file in cache.
 * Also handles .svelte.ts and .svelte.js imports.
 */
function rewriteSvelteImport(
  importPath: string,
  virtualFileDir: string,
  cacheDir: string,
  projectRoot: string,
  compilerOptions: ts.CompilerOptions | null,
  baseUrl: string | null,
): string {
  // Check if the import path already ends with .svelte.ts or .svelte.js
  // These are explicit imports to .svelte.ts/.svelte.js module files
  const explicitSvelteTs = importPath.endsWith(".svelte.ts");
  const explicitSvelteJs = importPath.endsWith(".svelte.js");

  if (explicitSvelteTs || explicitSvelteJs) {
    // For explicit .svelte.ts/.svelte.js imports, resolve and return the full path
    // to the project root to avoid confusion with .svelte.d.ts files in cache
    const baseImportPath = importPath.slice(0, explicitSvelteTs ? -3 : -3); // Remove .ts or .js
    const absolutePath = resolveImportPath(
      baseImportPath,
      virtualFileDir,
      cacheDir,
      projectRoot,
      compilerOptions,
      baseUrl,
    );

    if (!absolutePath) {
      return importPath;
    }

    const actualFilePath = explicitSvelteTs
      ? `${absolutePath}.ts`
      : `${absolutePath}.js`;

    if (fs.existsSync(actualFilePath)) {
      let relativePath = path.relative(virtualFileDir, actualFilePath);
      if (!relativePath.startsWith(".")) {
        relativePath = `./${relativePath}`;
      }
      return relativePath;
    }

    return importPath;
  }

  // Resolve the import path to an absolute path using TypeScript's module resolution
  const absolutePath = resolveImportPath(
    importPath,
    virtualFileDir,
    cacheDir,
    projectRoot,
    compilerOptions,
    baseUrl,
  );

  if (!absolutePath) {
    // Could not resolve, return original
    return importPath;
  }

  // Check if a .svelte.ts or .svelte.js file exists at the resolved path
  // If so, we need to rewrite the path to explicitly point to the project root
  // to avoid TypeScript resolving to the .svelte.d.ts file in the cache directory
  // (which is generated by svelte2tsx for the .svelte component)
  const svelteTsPath = `${absolutePath}.ts`;
  const svelteJsPath = `${absolutePath}.js`;
  if (fs.existsSync(svelteTsPath) || fs.existsSync(svelteJsPath)) {
    // Calculate relative path from virtual file to the actual .svelte.ts/.svelte.js file
    // in the project root (not the cache directory)
    const actualFilePath = fs.existsSync(svelteTsPath)
      ? svelteTsPath
      : svelteJsPath;
    let relativePath = path.relative(virtualFileDir, actualFilePath);

    // Ensure it starts with ./ or ../
    if (!relativePath.startsWith(".")) {
      relativePath = `./${relativePath}`;
    }

    return relativePath;
  }

  // Calculate the path to the .d.ts file in the cache directory
  const relativeToCacheRoot = path.relative(projectRoot, absolutePath);
  const dtsFileInCache = path.join(cacheDir, `${relativeToCacheRoot}.d.ts`);

  // Calculate relative path from the virtual file to the .d.ts file
  let relativePath = path.relative(virtualFileDir, dtsFileInCache);

  // Ensure it starts with ./ or ../
  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }

  // Remove .d.ts extension (TypeScript will find the .d.ts file)
  // Keep as .svelte.d so TypeScript resolves to .svelte.d.ts
  relativePath = relativePath.replace(/\.d\.ts$/, ".d");

  return relativePath;
}

/**
 * Resolve an import path to an absolute file path using TypeScript's module resolution.
 */
function resolveImportPath(
  importPath: string,
  virtualFileDir: string,
  cacheDir: string,
  projectRoot: string,
  compilerOptions: ts.CompilerOptions | null,
  baseUrlOverride: string | null,
): string | null {
  // Calculate the original file location (before being placed in cache)
  const relativeToCache = path.relative(cacheDir, virtualFileDir);
  const originalDir = path.join(projectRoot, relativeToCache);
  const containingFile = path.join(originalDir, "dummy.ts");

  // Handle relative imports
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    return path.resolve(originalDir, importPath);
  }

  // Use TypeScript's module resolution for path aliases
  if (compilerOptions) {
    // First, try to resolve the import with .ts extension appended
    // This handles the case where .svelte.ts file exists
    const resolvedWithTs = ts.resolveModuleName(
      `${importPath}.ts`,
      containingFile,
      compilerOptions,
      ts.sys,
    );

    if (resolvedWithTs.resolvedModule) {
      let resolvedPath = resolvedWithTs.resolvedModule.resolvedFileName;
      // Remove .ts extension -> .svelte
      if (resolvedPath.endsWith(".svelte.ts")) {
        resolvedPath = resolvedPath.slice(0, -3);
      }
      return resolvedPath;
    }

    // Try to resolve using path aliases manually since TypeScript
    // doesn't resolve .svelte files by default
    const { paths } = compilerOptions;
    if (paths) {
      for (const [pattern, targets] of Object.entries(paths)) {
        const match = matchPathAlias(importPath, pattern);
        if (match !== null && targets.length > 0) {
          const target = targets[0];
          const resolvedTarget = target.replace("*", match);
          // Use baseUrlOverride (from TsConfigInfo, defaults to tsconfig directory)
          // Fall back to projectRoot if not set
          const base = baseUrlOverride ?? projectRoot;
          return path.resolve(base, resolvedTarget);
        }
      }
    }
  }

  // Fallback: try to resolve manually for simple cases
  // This handles cases where compilerOptions is null
  return null;
}

/**
 * Match an import path against a path alias pattern.
 * Returns the matched wildcard portion, or null if no match.
 */
function matchPathAlias(
  importPath: string,
  aliasPattern: string,
): string | null {
  // Handle patterns like "$lib/*" or "@/*"
  if (aliasPattern.endsWith("/*")) {
    const prefix = aliasPattern.slice(0, -2);
    if (importPath.startsWith(`${prefix}/`)) {
      return importPath.slice(prefix.length + 1);
    }
  } else if (aliasPattern.endsWith("*")) {
    const prefix = aliasPattern.slice(0, -1);
    if (importPath.startsWith(prefix)) {
      return importPath.slice(prefix.length);
    }
  } else {
    // Exact match
    if (importPath === aliasPattern) {
      return "";
    }
  }
  return null;
}
