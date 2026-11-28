import type { Token } from "../ast/index.js";
import type { ESLintExtendedProgram } from "./index.js";
import { traverseNodes } from "../traverse.js";

/**
 * Remove the semicolons put between `<script>` blocks (see `Context`) from the
 * given parse result: their tokens, and the empty statements they make. A node
 * that a semicolon ended, such as a statement without its own semicolon, is
 * ended at the token before the semicolon instead.
 */
export function removeInsertedSemicolons(
  result: ESLintExtendedProgram,
  indexes: readonly number[],
): void {
  const { ast } = result;
  const tokens = ast.tokens;
  if (!indexes.length || !tokens) {
    return;
  }

  /** Check whether the given token is an inserted semicolon. */
  function isInsertedToken(token: Token) {
    return token.value === ";" && indexes.includes(token.range[0]);
  }

  /** Check whether the given node is an empty statement of an inserted semicolon. */
  function isInsertedStatement(node: { type: string; range?: number[] }) {
    return node.type === "EmptyStatement" && indexes.includes(node.range![0]);
  }

  // The token before each inserted semicolon, keyed by the semicolon end.
  const previousTokens = new Map<number, Token>();
  let previous: Token | null = null;
  for (const token of tokens) {
    if (!isInsertedToken(token)) {
      previous = token;
    } else if (previous) {
      previousTokens.set(token.range[1], previous);
    }
  }

  // A semicolon that is the body of a statement, as in a script that ends with
  // `$:` or `if (a)`, is kept. The statement then runs into the next script and
  // is reported as unterminated, as Svelte does not allow it either.
  const keptEnds = new Set<number>();
  traverseNodes(ast, {
    visitorKeys: result.visitorKeys,
    enterNode() {
      // noop
    },
    leaveNode(node, parent) {
      const end = node.range![1];
      if (isInsertedStatement(node)) {
        if (parent !== ast) {
          keptEnds.add(end);
        }
        return;
      }
      const previousToken = !keptEnds.has(end) && previousTokens.get(end);
      if (previousToken) {
        node.range![1] = previousToken.range[1];
        node.loc!.end = { ...previousToken.loc.end };
      }
    },
  });

  ast.body = ast.body.filter((node) => !isInsertedStatement(node));
  let length = 0;
  for (const token of tokens) {
    if (!isInsertedToken(token) || keptEnds.has(token.range[1])) {
      tokens[length++] = token;
    }
  }
  tokens.length = length;
}
