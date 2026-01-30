export {
  VirtualCodeCacheManager,
  getVirtualCodeCacheManager,
  resetVirtualCodeCacheManager,
  type VirtualCodeResult,
} from "./manager.js";
export { findProjectRoot, getCacheDirectory } from "./project-root.js";
export { scanSvelteFiles } from "./file-scanner.js";
export { generateHash, loadHashMap, saveHashMap } from "./hash.js";
export {
  rewriteImportPaths,
  rewriteImportPathsWithPositions,
} from "./import-rewriter.js";
export {
  generateTsconfig,
  getGeneratedTsconfigPath,
} from "./tsconfig-generator.js";
