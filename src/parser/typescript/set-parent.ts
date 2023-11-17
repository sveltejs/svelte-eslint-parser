import type { ESLintExtendedProgram } from "..";
import { traverseNodes } from "../..";
import type { TSESParseForESLintResult } from "./types";

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
