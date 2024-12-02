import type * as ESTree from "estree";
import type { Comment, Locations, Token } from "../ast/index.js";
import type { Context } from "./index.js";
import { traverseNodes } from "../traverse.js";

/** Fix locations */
export function fixLocations(
  node: ESTree.Node,
  tokens: Token[],
  comments: Comment[],
  offset: number,
  visitorKeys: { [type: string]: string[] } | undefined,
  ctx: Context,
): void {
  if (offset === 0) {
    return;
  }
  const traversed = new Set<any>();
  traverseNodes(node, {
    visitorKeys,
    enterNode: (n) => {
      if (traversed.has(n)) {
        return;
      }
      traversed.add(n);
      if (traversed.has(n.range)) {
        if (!traversed.has(n.loc)) {
          // However, `Node#loc` may not be shared.
          const locs = ctx.getConvertLocation({
            start: n.range![0],
            end: n.range![1],
          });
          applyLocs(n, locs);
          traversed.add(n.loc);
        }
      } else {
        const start = n.range![0] + offset;
        const end = n.range![1] + offset;
        const locs = ctx.getConvertLocation({ start, end });
        applyLocs(n, locs);
        traversed.add(n.range);
        traversed.add(n.loc);
      }
    },
    leaveNode: Function.prototype as any,
  });
  for (const t of tokens) {
    const start = t.range[0] + offset;
    const end = t.range[1] + offset;
    const locs = ctx.getConvertLocation({ start, end });
    applyLocs(t, locs);
  }
  for (const t of comments) {
    const start = t.range[0] + offset;
    const end = t.range[1] + offset;
    const locs = ctx.getConvertLocation({ start, end });
    applyLocs(t, locs);
  }
}

/**
 * applyLocs
 */
function applyLocs(target: Locations | ESTree.Node, locs: Locations) {
  target.loc = locs.loc;
  target.range = locs.range;
  if (typeof (target as any).start === "number") {
    delete (target as any).start;
  }
  if (typeof (target as any).end === "number") {
    delete (target as any).end;
  }
}
