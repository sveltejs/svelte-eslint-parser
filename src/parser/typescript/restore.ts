import type { TSESTree } from "@typescript-eslint/types";
import { traverseNodes } from "../../traverse";
import { LinesAndColumns } from "../../context";
import type { TSESParseForESLintResult } from "./types";

/**
 * A function that restores the statement.
 * @param node The node to restore.
 * @param result The result of parsing.
 * @returns
 *   If `false`, it indicates that the specified node was not processed.
 *
 *   If `true`, it indicates that the specified node was processed for processing.
 *   This process will no longer be called.
 */
type RestoreStatementProcess = (
  node: TSESTree.Statement,
  result: TSESParseForESLintResult
) => boolean;

export class RestoreContext {
  private readonly originalLocs: LinesAndColumns;

  private readonly offsets: { original: number; dist: number }[] = [];

  private readonly virtualFragments: { start: number; end: number }[] = [];

  private readonly restoreStatementProcesses: RestoreStatementProcess[] = [];

  public constructor(code: string) {
    this.originalLocs = new LinesAndColumns(code);
  }

  public addRestoreStatementProcess(process: RestoreStatementProcess): void {
    this.restoreStatementProcesses.push(process);
  }

  public addOffset(offset: { original: number; dist: number }): void {
    this.offsets.push(offset);
  }

  public addVirtualFragmentRange(start: number, end: number): void {
    const peek = this.virtualFragments[this.virtualFragments.length - 1];
    if (peek && peek.end === start) {
      peek.end = end;
      return;
    }
    this.virtualFragments.push({ start, end });
  }

  /**
   * Restore AST nodes
   */
  public restore(result: TSESParseForESLintResult): void {
    remapLocations(result, {
      remapLocation: (n) => this.remapLocation(n),
      removeToken: (token) =>
        this.virtualFragments.some(
          (f) => f.start <= token.range[0] && token.range[1] <= f.end
        ),
    });

    restoreStatements(result, this.restoreStatementProcesses);

    // Adjust program node location
    const firstOffset = Math.min(
      ...[result.ast.body[0], result.ast.tokens?.[0], result.ast.comments?.[0]]
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .map((t) => t.range[0])
    );
    if (firstOffset < result.ast.range[0]) {
      result.ast.range[0] = firstOffset;
      result.ast.loc.start = this.originalLocs.getLocFromIndex(firstOffset);
    }
  }

  private remapLocation(node: TSESTree.Node | TSESTree.Token): void {
    let [start, end] = node.range;
    const startFragment = this.virtualFragments.find(
      (f) => f.start <= start && start < f.end
    );
    if (startFragment) {
      start = startFragment.end;
    }
    const endFragment = this.virtualFragments.find(
      (f) => f.start < end && end <= f.end
    );
    if (endFragment) {
      end = endFragment.start;
      if (startFragment === endFragment) {
        start = startFragment.start;
      }
    }

    if (end < start) {
      const w = start;
      start = end;
      end = w;
    }

    const locs = this.originalLocs.getLocations(
      ...this.getRemapRange(start, end)
    );

    node.loc = locs.loc;
    node.range = locs.range;

    if ((node as any).start != null) {
      delete (node as any).start;
    }
    if ((node as any).end != null) {
      delete (node as any).end;
    }
  }

  private getRemapRange(start: number, end: number): TSESTree.Range {
    if (!this.offsets.length) {
      return [start, end];
    }
    let lastStart = this.offsets[0];
    let lastEnd = this.offsets[0];
    for (const offset of this.offsets) {
      if (offset.dist <= start) {
        lastStart = offset;
      }
      if (offset.dist < end) {
        lastEnd = offset;
      } else {
        break;
      }
    }

    const remapStart = lastStart.original + (start - lastStart.dist);
    const remapEnd = lastEnd.original + (end - lastEnd.dist);
    return [remapStart, remapEnd];
  }
}

/** Restore locations */
function remapLocations(
  result: TSESParseForESLintResult,
  {
    remapLocation,
    removeToken,
  }: {
    remapLocation: (node: TSESTree.Node | TSESTree.Token) => void;
    removeToken: (node: TSESTree.Token) => boolean;
  }
) {
  const traversed = new Map<TSESTree.Node, TSESTree.Node | null>();
  // remap locations
  traverseNodes(result.ast, {
    visitorKeys: result.visitorKeys,
    enterNode: (node, p) => {
      if (!traversed.has(node)) {
        traversed.set(node, p);

        remapLocation(node);
      }
    },
    leaveNode: (_node) => {
      // noop
    },
  });
  const tokens: TSESTree.Token[] = [];
  for (const token of result.ast.tokens || []) {
    if (removeToken(token)) {
      continue;
    }
    remapLocation(token);
    tokens.push(token);
  }
  result.ast.tokens = tokens;
  for (const token of result.ast.comments || []) {
    remapLocation(token);
  }
}

/** Restore statement nodes */
function restoreStatements(
  result: TSESParseForESLintResult,
  restoreStatementProcesses: RestoreStatementProcess[]
) {
  const restoreStatementProcessesSet = new Set(restoreStatementProcesses);
  for (const node of [...result.ast.body]) {
    if (!restoreStatementProcessesSet.size) {
      break;
    }
    for (const proc of restoreStatementProcessesSet) {
      if (proc(node, result)) {
        restoreStatementProcessesSet.delete(proc);
        break;
      }
    }
  }
}
