import type * as ESTree from "estree";
import type { Comment, Locations, Token } from "../ast/index.js";
import type { Context } from "./index.js";
import { LinesAndColumns } from "./index.js";
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

/** Recompute the locations of the given AST from its ranges. */
export function fixLocationsFromRanges(
  node: ESTree.Node,
  tokens: Token[],
  comments: Comment[],
  visitorKeys: { [type: string]: string[] } | undefined,
  ctx: Context,
): void {
  /** Recompute the location of the given node or token. */
  function fix(n: Locations | ESTree.Node) {
    n.loc = ctx.getConvertLocation({
      start: n.range![0],
      end: n.range![1],
    }).loc;
  }

  traverseNodes(node, {
    visitorKeys,
    enterNode: fix,
    leaveNode: Function.prototype as any,
  });
  tokens.forEach(fix);
  comments.forEach(fix);
}

/**
 * Fix the location of an error thrown while parsing the given virtual code,
 * when the line breaks in the virtual code differ from the original code.
 */
export function fixErrorLocation(
  error: unknown,
  virtualCode: string,
  ctx: Context,
): void {
  const e = error as {
    index?: unknown;
    pos?: unknown;
    lineNumber?: unknown;
    column?: unknown;
    message?: unknown;
  } | null;
  if (!e || typeof e.lineNumber !== "number" || typeof e.column !== "number") {
    return;
  }
  const virtualLocs = new LinesAndColumns(virtualCode);
  // Some parsers (e.g. @babel/eslint-parser) do not give `index`.
  const index =
    typeof e.index === "number"
      ? e.index
      : typeof e.pos === "number"
        ? e.pos
        : getIndexInLine(virtualLocs, e.lineNumber, e.column);
  if (!Number.isFinite(index) || index < 0 || index > ctx.code.length) {
    return;
  }
  const virtualLoc = virtualLocs.getLocFromIndex(index);
  const loc = ctx.getLocFromIndex(index);
  const lineNumber = e.lineNumber + loc.line - virtualLoc.line;
  const column = e.column + loc.column - virtualLoc.column;
  // Some parsers (e.g. @babel/eslint-parser) put the location at the end of
  // the message, like `Unexpected token (2:27)`.
  const locSuffix = ` (${e.lineNumber}:${e.column})`;
  if (typeof e.message === "string" && e.message.endsWith(locSuffix)) {
    e.message = `${e.message.slice(0, -locSuffix.length)} (${lineNumber}:${column})`;
  }
  // Define own properties, since some parsers (e.g. typescript-eslint) only
  // have getters for them.
  Object.defineProperties(e, {
    lineNumber: {
      value: lineNumber,
      configurable: true,
      enumerable: true,
      writable: true,
    },
    column: {
      value: column,
      configurable: true,
      enumerable: true,
      writable: true,
    },
  });
}

/**
 * Get the index of the given line and column. ESLint takes `column` as 1-based,
 * but some parsers (e.g. hermes-eslint) give a 0-based one. Read it as 1-based,
 * which gives the index or the one before it, and keep it in the given line.
 */
function getIndexInLine(
  locs: LinesAndColumns,
  line: number,
  column: number,
): number {
  return locs.getIndexFromLoc({ line, column: Math.max(column - 1, 0) });
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
