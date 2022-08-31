import type { ESLintExtendedProgram } from "..";
import type { Context } from "../../context";
import { traverseNodes } from "../../traverse";
import { parseScriptWithoutAnalyzeScope } from "../script";

/**
 * Append type declarations for svelte variables.
 * - Append TypeScript code like
 *   `declare let $foo: Parameters<Parameters<(typeof foo)["subscribe"]>[0]>[0];`
 *   to define the type information for like `$foo` variable.
 * - Append TypeScript code like `let foo = bar;` to define the type information for like `$: foo = bar` variable.
 */
export function appendDeclareSvelteVarsTypes(ctx: Context): void {
  const vcode = ctx.sourceCode.scripts.vcode;

  if (/\$\s*:\s*[\p{ID_Start}$(_]/u.test(vcode)) {
    // Probably have a reactive variable, so we will need to parse TypeScript once to extract the reactive variables.
    const result = parseScriptWithoutAnalyzeScope(
      vcode,
      ctx.sourceCode.scripts.attrs,
      {
        ...ctx.parserOptions,
        // Without typings
        project: null,
      }
    );
    appendDeclareSvelteVarsTypesFromAST(result, vcode, ctx);
  } else {
    appendDeclareStoreTypesFromText(vcode, ctx);
  }
}

/**
 * Append type declarations for svelte variables from AST.
 */
function appendDeclareSvelteVarsTypesFromAST(
  result: ESLintExtendedProgram,
  code: string,
  ctx: Context
) {
  const maybeStores = new Set<string>();

  traverseNodes(result.ast, {
    visitorKeys: result.visitorKeys,
    enterNode: (node, parent) => {
      if (node.type === "Identifier") {
        if (!node.name.startsWith("$") || node.name.length <= 1) {
          return;
        }
        maybeStores.add(node.name.slice(1));
      } else if (node.type === "LabeledStatement") {
        if (
          node.label.name !== "$" ||
          parent !== result.ast ||
          node.body.type !== "ExpressionStatement" ||
          node.body.expression.type !== "AssignmentExpression"
        ) {
          return;
        }
        // It is reactive variable declaration.
        const text = code.slice(...node.body.expression.range!);
        ctx.scriptLet.appendDeclareReactiveVar(text);
      }
    },
    leaveNode() {
      /* noop */
    },
  });
  ctx.scriptLet.appendDeclareMaybeStores(maybeStores);
}

/**
 * Append type declarations for store access.
 * Append TypeScript code like
 * `declare let $foo: Parameters<Parameters<(typeof foo)["subscribe"]>[0]>[0];`
 * to define the type information for like `$foo` variable.
 */
function appendDeclareStoreTypesFromText(vcode: string, ctx: Context): void {
  const extractStoreRe = /\$[\p{ID_Start}$_][\p{ID_Continue}$\u200c\u200d]*/giu;
  let m;
  const maybeStores = new Set<string>();
  while ((m = extractStoreRe.exec(vcode))) {
    const storeName = m[0];
    const originalName = storeName.slice(1);
    maybeStores.add(originalName);
  }

  ctx.scriptLet.appendDeclareMaybeStores(maybeStores);
}
