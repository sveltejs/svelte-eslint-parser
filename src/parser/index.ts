import { KEYS } from "../visitor-keys";
import { Context } from "../context";
import type {
  Comment,
  SvelteProgram,
  SvelteScriptElement,
  SvelteStyleElement,
  Token,
} from "../ast";
import type { Program } from "estree";
import type { ScopeManager } from "eslint-scope";
import { Variable } from "eslint-scope";
import { parseScript, parseScriptInSvelte } from "./script";
import type * as SvAST from "./svelte-ast-types";
import { sortNodes } from "./sort";
import { parseTemplate } from "./template";
import {
  analyzePropsScope,
  analyzeReactiveScope,
  analyzeRunesScope,
  analyzeStoreScope,
} from "./analyze-scope";
import { ParseError } from "../errors";
import { parseTypeScript } from "./typescript";
import { addReference } from "../scope";
import {
  parseStyleContext,
  type StyleContext,
  type StyleContextNoStyleElement,
  type StyleContextParseError,
  type StyleContextSuccess,
  type StyleContextUnknownLang,
  styleNodeLoc,
  styleNodeRange,
} from "./style-context";
import { globals } from "./globals";

export {
  StyleContext,
  StyleContextNoStyleElement,
  StyleContextParseError,
  StyleContextSuccess,
  StyleContextUnknownLang,
};

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
type ParseResult = {
  ast: SvelteProgram;
  services: Record<string, any> &
    (
      | {
          isSvelte: true;
          svelteOptions: { runes: boolean };
          getSvelteHtmlAst: () => SvAST.Fragment;
          getStyleContext: () => StyleContext;
        }
      | { isSvelte: false; svelteOptions: { runes: boolean } }
    );
  visitorKeys: { [type: string]: string[] };
  scopeManager: ScopeManager;
};
/**
 * Parse source code
 */
export function parseForESLint(code: string, options?: any): ParseResult {
  const parserOptions = normalizeParserOptions(options);

  if (
    parserOptions.filePath &&
    !parserOptions.filePath.endsWith(".svelte") &&
    parserOptions.svelteFeatures.runes
  ) {
    const trimmed = code.trim();
    if (!trimmed.startsWith("<") && !trimmed.endsWith(">")) {
      return parseAsScript(code, parserOptions);
    }
  }

  return parseAsSvelte(code, parserOptions);
}

/**
 * Parse source code as svelte component
 */
function parseAsSvelte(
  code: string,
  parserOptions: NormalizedParserOptions,
): ParseResult {
  const ctx = new Context(code, parserOptions);
  const resultTemplate = parseTemplate(
    ctx.sourceCode.template,
    ctx,
    parserOptions,
  );

  const runes = ctx.runes ?? parserOptions.svelteFeatures.runes;

  const scripts = ctx.sourceCode.scripts;
  const resultScript = ctx.isTypeScript()
    ? parseTypeScript(
        scripts.getCurrentVirtualCodeInfo(),
        scripts.attrs,
        parserOptions,
        { slots: ctx.slots },
      )
    : parseScriptInSvelte(
        scripts.getCurrentVirtualCode(),
        scripts.attrs,
        parserOptions,
      );
  ctx.scriptLet.restore(resultScript);
  ctx.tokens.push(...resultScript.ast.tokens);
  ctx.comments.push(...resultScript.ast.comments);
  sortNodes(ctx.comments);
  sortNodes(ctx.tokens);
  extractTokens(ctx);
  analyzeStoreScope(resultScript.scopeManager!);
  analyzeReactiveScope(resultScript.scopeManager!);
  analyzeStoreScope(resultScript.scopeManager!); // for reactive vars

  // Add $$xxx variable
  const globalScope = resultScript.scopeManager!.globalScope;
  for (const $$name of globals) {
    if (globalScope.set.has($$name)) continue;
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
        addReference(variable.references, reference);
        return false;
      }
      return true;
    });
  }

  if (runes) {
    analyzeRunesScope(resultScript.scopeManager!);
  }

  const ast = resultTemplate.ast;

  const statements = [...resultScript.ast.body];

  ast.sourceType = resultScript.ast.sourceType;

  const scriptElements = ast.body.filter(
    (b): b is SvelteScriptElement => b.type === "SvelteScriptElement",
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
          attr.value[0].value === "module",
      )
    ) {
      analyzePropsScope(body, resultScript.scopeManager!);
    }
  }
  if (statements.length) {
    throw new ParseError(
      "The script is unterminated",
      statements[0].range![1],
      ctx,
    );
  }

  const styleElement = ast.body.find(
    (b): b is SvelteStyleElement => b.type === "SvelteStyleElement",
  );
  let styleContext: StyleContext | null = null;

  resultScript.ast = ast as any;
  resultScript.services = Object.assign(resultScript.services || {}, {
    isSvelte: true,
    svelteOptions: { runes },
    getSvelteHtmlAst() {
      return resultTemplate.svelteAst.html;
    },
    getStyleContext() {
      if (styleContext === null) {
        styleContext = parseStyleContext(styleElement, ctx);
      }
      return styleContext;
    },
    styleNodeLoc,
    styleNodeRange,
  });
  resultScript.visitorKeys = Object.assign({}, KEYS, resultScript.visitorKeys);

  return resultScript as any;
}

/**
 * Parse source code as script
 */
function parseAsScript(
  code: string,
  parserOptions: NormalizedParserOptions,
): ParseResult {
  const lang = parserOptions.filePath?.split(".").pop() || "js";
  const resultScript = parseScript(code, { lang }, parserOptions);
  analyzeRunesScope(resultScript.scopeManager!);
  resultScript.services = Object.assign(resultScript.services || {}, {
    isSvelte: false,
    svelteOptions: { runes: true },
  });
  resultScript.visitorKeys = Object.assign({}, KEYS, resultScript.visitorKeys);
  return resultScript as any;
}

type NormalizedParserOptions = {
  ecmaVersion: number | "latest";
  sourceType: "module" | "script";
  loc: boolean;
  range: boolean;
  raw: boolean;
  tokens: boolean;
  comment: boolean;
  eslintVisitorKeys: boolean;
  eslintScopeManager: boolean;
  svelteFeatures: { runes: boolean };
  filePath?: string;
};

/** Normalize parserOptions */
function normalizeParserOptions(options: any): NormalizedParserOptions {
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
    svelteFeatures: {
      rune: false,
      ...(options?.svelteFeatures || {}),
    },
    ...(options || {}),
  };
  parserOptions.sourceType = "module";
  if (parserOptions.ecmaVersion <= 5 || parserOptions.ecmaVersion == null) {
    parserOptions.ecmaVersion = 2015;
  }

  return parserOptions;
}

/** Extract tokens */
function extractTokens(ctx: Context) {
  const useRanges = sortNodes([...ctx.tokens, ...ctx.comments]).map(
    (t) => t.range,
  );
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
  sortNodes(ctx.comments);
  sortNodes(ctx.tokens);

  /**
   * Checks if the given char is punctuator
   */
  function isPunctuator(c: string) {
    return /^[^\w$]$/iu.test(c);
  }
}
