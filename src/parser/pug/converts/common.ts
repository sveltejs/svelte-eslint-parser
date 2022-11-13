import type ESTree from "estree";
import type { Locations, SveltePugNode } from "../../../ast";

export function getWithLoc<N extends ESTree.Comment>(
  node: N
): N & { start: number; end: number };
export function getWithLoc<
  N extends ESTree.Node | { start: number; end: number }
>(node: N): N & { start: number; end: number };
export function getWithLoc<
  N extends ESTree.Node | { start: number; end: number }
>(node: N | null): (N & { start: number; end: number }) | null;
export function getWithLoc<
  N extends ESTree.Node | { start: number; end: number }
>(node: N | undefined): (N & { start: number; end: number }) | undefined;

/** Get node with location */
export function getWithLoc(node: any): { start: number; end: number } {
  return node;
}

/** Set end location */
export function setEndLocation(
  node: SveltePugNode,
  lastNode: Locations | null | undefined
): void {
  if (lastNode) {
    node.range[1] = lastNode.range[1];
    node.loc.end = { ...lastNode.loc.end };
  }
}
