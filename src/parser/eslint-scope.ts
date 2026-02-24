import { loadNewestModule } from "../utils/cjs-module.js";
import * as eslintScope from "eslint-scope";

let eslintScopeCache: typeof eslintScope | null = null;

/**
 * Load `eslint-scope` from ESLint's dependencies, user dependencies, or this package's dependencies.
 * Return the latest version among them.
 */
export function getESLintScope(): typeof eslintScope {
  if (!eslintScopeCache) {
    try {
      eslintScopeCache = loadNewestModule("eslint-scope");
    } catch {
      // ignore
    }
    if (!eslintScopeCache) {
      eslintScopeCache = (eslintScope as any).default || eslintScope;
    }
  }

  return eslintScopeCache!;
}
