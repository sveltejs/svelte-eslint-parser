import type ESTree from "estree";
/** indexOf */
export function indexOf(
  str: string,
  search: (c: string, index: number) => boolean,
  start: number,
  end?: number,
): number {
  const endIndex = end ?? str.length;
  for (let index = start; index < endIndex; index++) {
    const c = str[index];
    if (search(c, index)) {
      return index;
    }
  }
  return -1;
}

/** lastIndexOf */
export function lastIndexOf(
  str: string,
  search: (c: string, index: number) => boolean,
  end: number,
): number {
  for (let index = end; index >= 0; index--) {
    const c = str[index];
    if (search(c, index)) {
      return index;
    }
  }
  return -1;
}

export function getWithLoc<N extends ESTree.Comment>(
  node: N,
): N & { start: number; end: number };
export function getWithLoc<
  N extends ESTree.Node | { start: number; end: number },
>(node: N): N & { start: number; end: number };
export function getWithLoc<
  N extends ESTree.Node | { start: number; end: number },
>(
  node: N | null | undefined,
): (N & { start: number; end: number }) | null | undefined;

/** Get node with location */
export function getWithLoc(node: any): { start: number; end: number } {
  return node;
}
