import type { ESLintExtendedProgram } from "../index.js";
import { traverseNodes } from "../../index.js";
import type { TSESParseForESLintResult } from "./types.js";

export function setParent(
  result: ESLintExtendedProgram | TSESParseForESLintResult,
): void {
  if (result.ast.body.some((node) => (node as any).parent)) {
    return;
  }
  traverseNodes(result.ast, {
    visitorKeys: result.visitorKeys,
    enterNode(node, parent) {
      (node as any).parent = parent;
    },
    leaveNode() {
      // noop
    },
  });
}
