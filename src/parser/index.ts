import { KEYS } from "../visitor-keys";
import { Context } from "../context";
import type {
  Comment,
  SvelteProgram,
  SvelteScriptElement,
  Token,
} from "../ast";
import type { Program } from "estree";
import type { ScopeManager } from "eslint-scope";
import { Variable } from "eslint-scope";
import { parseScript } from "./script";
import type * as SvAST from "./svelte-ast-types";
import { sort } from "./sort";
import { parseTemplate } from "./template";
import {
  analyzePropsScope,
  analyzeReactiveScope,
  analyzeStoreScope,
} from "./analyze-scope";
import { ParseError } from "../errors";
import { appendDeclareSvelteVarsTypes } from "./analyze-type";

export interface ESLintProgram extends Program {
  comments: Comment[];
  tokens: Token[];
}
/**
 * The parsing result of ESLint custom parsers.
 */
export interface ESLintExtendedProgram {
  ast: ESLintProgram;
  services?: Record<string, any>;
  visitorKeys?: { [type: string]: string[] };
  scopeManager?: ScopeManager;

  // For debug
  // The code used to parse the script.
  _virtualScriptCode?: string;
}
/**
 * Parse source code
 */
export function parseForESLint(
  code: string,
  options?: any
): {
  ast: SvelteProgram;
  services: Record<string, any> & {
    isSvelte: true;
    getSvelteHtmlAst: () => SvAST.Fragment;
  };
  visitorKeys: { [type: string]: string[] };
  scopeManager: ScopeManager;
} {
  const parserOptions = {
    ecmaVersion: 2020,
    sourceType: "module",
    loc: true,
    range: true,
    raw: true,
    tokens: true,
    comment: true,
    eslintVisitorKeys: true,
    eslintScopeManager: true,
    ...(options || {}),
  };
  parserOptions.sourceType = "module";
  if (parserOptions.ecmaVersion <= 5 || parserOptions.ecmaVersion == null) {
    parserOptions.ecmaVersion = 2015;
  }

  const ctx = new Context(code, parserOptions);
  const resultTemplate = parseTemplate(
    ctx.sourceCode.template,
    ctx,
    parserOptions
  );

  if (ctx.isTypeScript()) appendDeclareSvelteVarsTypes(ctx);

  const resultScript = parseScript(ctx.sourceCode.scripts, parserOptions);
  ctx.scriptLet.restore(resultScript);
  ctx.tokens.push(...resultScript.ast.tokens);
  ctx.comments.push(...resultScript.ast.comments);
  sort(ctx.comments);
  sort(ctx.tokens);
  extractTokens(ctx);
  analyzeStoreScope(resultScript.scopeManager!);
  analyzeReactiveScope(resultScript.scopeManager!);
  analyzeStoreScope(resultScript.scopeManager!); // for reactive vars

  // Add $$xxx variable
  for (const $$name of ["$$slots", "$$props", "$$restProps"]) {
    const globalScope = resultScript.scopeManager!.globalScope;
    const variable = new Variable();
    variable.name = $$name;
    (variable as any).scope = globalScope;
    globalScope.variables.push(variable);
    globalScope.set.set($$name, variable);
    globalScope.through = globalScope.through.filter((reference) => {
      if (reference.identifier.name === $$name) {
        // Links the variable and the reference.
        // And this reference is removed from `Scope#through`.
        reference.resolved = variable;
        variable.references.push(reference);
        return false;
      }
      return true;
    });
  }

  const ast = resultTemplate.ast;

  const statements = [...resultScript.ast.body];

  ast.sourceType = resultScript.ast.sourceType;

  const scriptElements = ast.body.filter(
    (b): b is SvelteScriptElement => b.type === "SvelteScriptElement"
  );
  for (let index = 0; index < scriptElements.length; index++) {
    const body = scriptElements[index];
    let statement = statements[0];

    while (
      statement &&
      body.range[0] <= statement.range![0] &&
      (statement.range![1] <= body.range[1] ||
        index === scriptElements.length - 1)
    ) {
      (statement as any).parent = body;
      body.body.push(statement);
      statements.shift();
      statement = statements[0];
    }
    if (
      !body.startTag.attributes.some(
        (attr) =>
          attr.type === "SvelteAttribute" &&
          attr.key.name === "context" &&
          attr.value.length === 1 &&
          attr.value[0].type === "SvelteLiteral" &&
          attr.value[0].value === "module"
      )
    ) {
      analyzePropsScope(body, resultScript.scopeManager!);
    }
  }
  if (statements.length) {
    throw new ParseError(
      "The script is unterminated",
      statements[0].range![1],
      ctx
    );
  }

  resultScript.ast = ast as any;
  resultScript.services = Object.assign(resultScript.services || {}, {
    isSvelte: true,
    getSvelteHtmlAst() {
      return resultTemplate.svelteAst.html;
    },
  });
  resultScript.visitorKeys = Object.assign({}, KEYS, resultScript.visitorKeys);

  return resultScript as any;
}

/** Extract tokens */
function extractTokens(ctx: Context) {
  const useRanges = sort([...ctx.tokens, ...ctx.comments]).map((t) => t.range);
  let range = useRanges.shift();
  for (let index = 0; index < ctx.sourceCode.template.length; index++) {
    while (range && range[1] <= index) {
      range = useRanges.shift();
    }
    if (range && range[0] <= index) {
      index = range[1] - 1;
      continue;
    }
    const c = ctx.sourceCode.template[index];
    if (!c.trim()) {
      continue;
    }
    if (isPunctuator(c)) {
      ctx.addToken("Punctuator", { start: index, end: index + 1 });
    } else {
      // unknown
      // It is may be a bug.
      ctx.addToken("Identifier", { start: index, end: index + 1 });
    }
  }
  sort(ctx.comments);
  sort(ctx.tokens);

  /**
   * Checks if the given char is punctuator
   */
  function isPunctuator(c: string) {
    return /^[^\w$]$/iu.test(c);
  }
}
