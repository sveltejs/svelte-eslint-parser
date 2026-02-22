import type { BasicParserObject } from "./parser-object.js";
import { loadNewestModule } from "../utils/cjs-module.js";
import * as espree from "espree";

let espreeCache: (BasicParserObject & { latestEcmaVersion: number }) | null =
  null;

/**
 * Load `espree` from ESLint's dependencies, user dependencies, or this package's dependencies.
 * Return the latest version among them.
 */
export function getEspree(): BasicParserObject & { latestEcmaVersion: number } {
  if (!espreeCache) {
    try {
      espreeCache = loadNewestModule("espree");
    } catch {
      // ignore
    }
    if (!espreeCache) {
      espreeCache = (espree as any).default || espree;
    }
  }

  return espreeCache!;
}
