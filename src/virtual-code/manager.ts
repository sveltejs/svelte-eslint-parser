import fs from "fs";
import path from "path";
import type { NormalizedParserOptions } from "../parser/parser-options.js";
import type { SvelteImportInfo } from "../parser/typescript/context.js";
import { findProjectRoot, getCacheDirectory } from "./project-root.js";
import { scanSvelteFiles } from "./file-scanner.js";
import { generateHash, loadHashMap, saveHashMap } from "./hash.js";
import { generateTsconfig } from "./tsconfig-generator.js";
import {
  rewriteImportPathsWithPositions,
  type ImportRewriterContext,
} from "./import-rewriter.js";
import { generateDts } from "./dts-generator.js";
import {
  readTsConfigWithExtends,
  type TsConfigInfo,
} from "./tsconfig-reader.js";

// Parser version - increment when virtual code generation changes
// This invalidates the cache when the generation logic is updated
const PARSER_VERSION = "1.4.1-virtual-3";

/**
 * Result of virtual code generation.
 */
export interface VirtualCodeResult {
  /** The generated virtual TypeScript code */
  code: string;
  /** .svelte imports extracted from AST with their positions */
  svelteImports: SvelteImportInfo[];
}

/**
 * Manages the virtual TypeScript code cache for Svelte files.
 */
export class VirtualCodeCacheManager {
  private projectRoot: string | null = null;

  private cacheDir: string | null = null;

  private initialized = false;

  private hashMap: Map<string, string> = new Map();

  /** Cache of file mtimes (in milliseconds) to avoid re-reading unchanged files */
  private readonly mtimeMap: Map<string, number> = new Map();

  private generatedTsconfigPath: string | null = null;

  private tsConfigInfo: TsConfigInfo | null = null;

  /**
   * Check if the cache manager is initialized.
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the project root path.
   */
  public getProjectRoot(): string | null {
    return this.projectRoot;
  }

  /**
   * Initialize the virtual code cache.
   * This scans all Svelte files in the project and generates virtual TypeScript code.
   */
  public initialize(
    filePath: string,
    parserOptions: NormalizedParserOptions,
    generateVirtualCode: (
      filePath: string,
      content: string,
    ) => VirtualCodeResult | null,
  ): void {
    if (this.initialized) {
      return;
    }

    // Find project root
    this.projectRoot = findProjectRoot(filePath);
    if (!this.projectRoot) {
      // Cannot find project root, disable caching
      return;
    }

    // Set up cache directory
    this.cacheDir = getCacheDirectory(this.projectRoot);

    try {
      // Create cache directory if it doesn't exist
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      // Load existing hash map
      this.hashMap = loadHashMap(this.cacheDir, PARSER_VERSION);

      // Determine original tsconfig path and read config with extends resolution
      // This must happen before processing files so we have path aliases available
      const originalTsconfigPath = this.findOriginalTsconfig(parserOptions);
      if (originalTsconfigPath) {
        this.tsConfigInfo = readTsConfigWithExtends(originalTsconfigPath);
      }

      // Scan all Svelte files
      const svelteFiles = scanSvelteFiles(this.projectRoot);

      // Track which files we've processed
      const processedFiles = new Set<string>();

      // Process each Svelte file
      for (const svelteFilePath of svelteFiles) {
        const relativePath = path.relative(this.projectRoot, svelteFilePath);
        processedFiles.add(relativePath);

        try {
          // Get file stats for mtime caching
          const stats = fs.statSync(svelteFilePath);
          const mtime = stats.mtimeMs;

          const content = fs.readFileSync(svelteFilePath, "utf-8");
          const contentHash = generateHash(content);

          // Store mtime for later checks
          this.mtimeMap.set(relativePath, mtime);

          // Check if file needs update
          if (this.hashMap.get(relativePath) === contentHash) {
            // Check if virtual file exists
            const virtualFilePath = this.getVirtualFilePath(relativePath);
            if (fs.existsSync(virtualFilePath)) {
              // No update needed
              continue;
            }
          }

          // Generate virtual code
          const virtualCodeResult = generateVirtualCode(
            svelteFilePath,
            content,
          );
          if (virtualCodeResult) {
            this.writeVirtualFile(
              relativePath,
              virtualCodeResult.code,
              virtualCodeResult.svelteImports,
            );
            this.hashMap.set(relativePath, contentHash);
          }

          // Generate .d.ts file for type resolution of .svelte imports
          const isTsFile = this.isSvelteTypeScript(content);
          const dtsContent = generateDts(svelteFilePath, content, isTsFile);
          if (dtsContent) {
            this.writeDtsFile(relativePath, dtsContent);
          }
        } catch {
          // Skip files that can't be processed
          continue;
        }
      }

      // Clean up old files that no longer exist
      for (const [relativePath] of this.hashMap) {
        if (!processedFiles.has(relativePath)) {
          this.hashMap.delete(relativePath);
          const virtualFilePath = this.getVirtualFilePath(relativePath);
          const dtsFilePath = path.join(this.cacheDir, `${relativePath}.d.ts`);
          try {
            if (fs.existsSync(virtualFilePath)) {
              fs.unlinkSync(virtualFilePath);
            }
            if (fs.existsSync(dtsFilePath)) {
              fs.unlinkSync(dtsFilePath);
            }
          } catch {
            // Ignore cleanup errors
          }
        }
      }

      // Save updated hash map
      saveHashMap(this.cacheDir, this.hashMap, PARSER_VERSION);

      // Generate tsconfig.generated.json
      this.generatedTsconfigPath = generateTsconfig(
        this.projectRoot,
        this.cacheDir,
        originalTsconfigPath,
      );

      this.initialized = true;
    } catch {
      // On any error, disable caching
      this.projectRoot = null;
      this.cacheDir = null;
    }
  }

  /**
   * Get the path to the generated tsconfig file.
   */
  public getGeneratedTsconfigPath(): string | null {
    if (!this.initialized || !this.cacheDir) {
      return null;
    }
    return this.generatedTsconfigPath;
  }

  /**
   * Check if a file needs to be updated.
   */
  public needsUpdate(svelteFilePath: string, content: string): boolean {
    if (!this.initialized || !this.projectRoot) {
      return false;
    }

    const relativePath = path.relative(this.projectRoot, svelteFilePath);
    const contentHash = generateHash(content);
    const existingHash = this.hashMap.get(relativePath);

    return existingHash !== contentHash;
  }

  /**
   * Check if a file needs to be updated.
   * Uses mtime comparison first for performance, falling back to hash comparison if needed.
   */
  public needsUpdateByFilePath(svelteFilePath: string): boolean {
    if (!this.initialized || !this.projectRoot || !this.cacheDir) {
      return true;
    }

    const relativePath = path.relative(this.projectRoot, svelteFilePath);
    const existingHash = this.hashMap.get(relativePath);

    if (!existingHash) {
      return true;
    }

    // Check if virtual file exists
    const virtualFilePath = this.getVirtualFilePath(relativePath);
    if (!fs.existsSync(virtualFilePath)) {
      return true;
    }

    try {
      // Fast path: check mtime first
      const stats = fs.statSync(svelteFilePath);
      const currentMtime = stats.mtimeMs;
      const cachedMtime = this.mtimeMap.get(relativePath);

      // If mtime matches, file hasn't changed
      if (cachedMtime !== undefined && cachedMtime === currentMtime) {
        return false;
      }

      // mtime changed or not cached - need to check content hash
      const content = fs.readFileSync(svelteFilePath, "utf-8");
      const contentHash = generateHash(content);

      // Update mtime cache
      this.mtimeMap.set(relativePath, currentMtime);

      return existingHash !== contentHash;
    } catch {
      return true;
    }
  }

  /**
   * Update the virtual code for a file by reading the source from disk.
   */
  public updateVirtualCodeByFilePath(
    svelteFilePath: string,
    virtualCodeResult: VirtualCodeResult,
  ): void {
    if (!this.initialized || !this.projectRoot || !this.cacheDir) {
      return;
    }

    const relativePath = path.relative(this.projectRoot, svelteFilePath);

    // Read file to get content hash and mtime
    try {
      const stats = fs.statSync(svelteFilePath);
      const content = fs.readFileSync(svelteFilePath, "utf-8");
      const contentHash = generateHash(content);

      this.writeVirtualFile(
        relativePath,
        virtualCodeResult.code,
        virtualCodeResult.svelteImports,
      );
      this.hashMap.set(relativePath, contentHash);
      this.mtimeMap.set(relativePath, stats.mtimeMs);
    } catch {
      // Skip if file can't be read
    }
  }

  /**
   * Update the virtual code for a file.
   * Skips writing if the source content hasn't changed to preserve TypeScript's cache.
   */
  public updateVirtualCode(
    svelteFilePath: string,
    content: string,
    virtualCodeResult: VirtualCodeResult,
  ): void {
    if (!this.initialized || !this.projectRoot || !this.cacheDir) {
      return;
    }

    const relativePath = path.relative(this.projectRoot, svelteFilePath);
    const contentHash = generateHash(content);

    // Check if content has changed - if not, skip writing to preserve TypeScript's cache
    const existingHash = this.hashMap.get(relativePath);
    if (existingHash === contentHash) {
      const virtualFilePath = this.getVirtualFilePath(relativePath);
      if (fs.existsSync(virtualFilePath)) {
        return;
      }
    }

    // writeVirtualFile already handles import path rewriting
    this.writeVirtualFile(
      relativePath,
      virtualCodeResult.code,
      virtualCodeResult.svelteImports,
    );

    this.hashMap.set(relativePath, contentHash);
    // Note: saveHashMap is only called in initialize() to avoid
    // race conditions when multiple processes run concurrently.
    // The hash map will be saved on the next initialize() call.
  }

  /**
   * Get the virtual file path for a Svelte file (relative path).
   */
  private getVirtualFilePath(relativePath: string): string {
    if (!this.cacheDir) {
      throw new Error("Cache directory not set");
    }
    // Convert .svelte to .svelte.__virtual__.ts
    // We use .__virtual__.ts instead of .ts to avoid conflicts with existing .svelte.ts files
    return path.join(this.cacheDir, `${relativePath}.__virtual__.ts`);
  }

  /**
   * Get the virtual file path for a Svelte file (absolute path).
   * Returns null if caching is not initialized or the file is not in the project.
   */
  public getVirtualFilePathForSvelteFile(
    svelteFilePath: string,
  ): string | null {
    if (!this.initialized || !this.projectRoot || !this.cacheDir) {
      return null;
    }

    // Check if the file is within the project root
    const relativePath = path.relative(this.projectRoot, svelteFilePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return null;
    }

    return this.getVirtualFilePath(relativePath);
  }

  /**
   * Write a virtual file to the cache directory.
   */
  private writeVirtualFile(
    relativePath: string,
    virtualCode: string,
    svelteImports: SvelteImportInfo[],
  ): void {
    const virtualFilePath = this.getVirtualFilePath(relativePath);
    const virtualDir = path.dirname(virtualFilePath);

    // Ensure directory exists
    if (!fs.existsSync(virtualDir)) {
      fs.mkdirSync(virtualDir, { recursive: true });
    }

    // Rewrite import paths using AST-extracted positions
    const context: ImportRewriterContext | null =
      this.cacheDir && this.projectRoot
        ? {
            virtualFilePath,
            cacheDir: this.cacheDir,
            projectRoot: this.projectRoot,
            pathAliases: this.tsConfigInfo?.paths ?? null,
            baseUrl: this.tsConfigInfo?.baseUrl ?? null,
            compilerOptions: this.tsConfigInfo?.compilerOptions ?? null,
          }
        : null;
    const rewrittenCode = rewriteImportPathsWithPositions(
      virtualCode,
      svelteImports,
      context,
    );

    fs.writeFileSync(virtualFilePath, rewrittenCode, "utf-8");
  }

  /**
   * Check if a Svelte file uses TypeScript.
   */
  private isSvelteTypeScript(content: string): boolean {
    // Check for <script lang="ts"> or <script lang="typescript">
    return /<script[^>]*\slang\s*=\s*["'](?:ts|typescript)["'][^>]*>/i.test(
      content,
    );
  }

  /**
   * Write .d.ts file to the cache directory.
   */
  private writeDtsFile(relativePath: string, dtsContent: string): void {
    if (!this.cacheDir) {
      return;
    }
    // Generate .svelte.d.ts in cache directory
    const dtsFilePath = path.join(this.cacheDir, `${relativePath}.d.ts`);
    const dtsDir = path.dirname(dtsFilePath);

    try {
      if (!fs.existsSync(dtsDir)) {
        fs.mkdirSync(dtsDir, { recursive: true });
      }
      fs.writeFileSync(dtsFilePath, dtsContent, "utf-8");
    } catch {
      // Silently ignore write errors
    }
  }

  /**
   * Find the original tsconfig file path.
   */
  private findOriginalTsconfig(
    parserOptions: NormalizedParserOptions,
  ): string | null {
    if (!this.projectRoot) {
      return null;
    }

    // Check if project option is specified
    if (parserOptions.project) {
      const projectPaths = Array.isArray(parserOptions.project)
        ? parserOptions.project
        : [parserOptions.project];

      for (const projectPath of projectPaths) {
        if (projectPath && typeof projectPath === "string") {
          const resolvedPath = path.isAbsolute(projectPath)
            ? projectPath
            : path.join(this.projectRoot, projectPath);
          if (fs.existsSync(resolvedPath)) {
            return resolvedPath;
          }
        }
      }
    }

    // Default to tsconfig.json in project root
    const defaultTsconfig = path.join(this.projectRoot, "tsconfig.json");
    if (fs.existsSync(defaultTsconfig)) {
      return defaultTsconfig;
    }

    return null;
  }
}

// Singleton instance
let cacheManager: VirtualCodeCacheManager | null = null;

/**
 * Get the singleton cache manager instance.
 */
export function getVirtualCodeCacheManager(): VirtualCodeCacheManager {
  if (!cacheManager) {
    cacheManager = new VirtualCodeCacheManager();
  }
  return cacheManager;
}

/**
 * Reset the cache manager (for testing purposes).
 */
export function resetVirtualCodeCacheManager(): void {
  cacheManager = null;
}
