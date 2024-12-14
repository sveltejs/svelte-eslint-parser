import { KEYS } from "../visitor-keys.js";
import { Context } from "../context/index.js";
import type {
  Comment,
  SvelteProgram,
  SvelteScriptElement,
  SvelteStyleElement,
  Token,
} from "../ast/index.js";
import type { Program } from "estree";
import type { ScopeManager } from "eslint-scope";
import { Variable } from "eslint-scope";
import { parseScript, parseScriptInSvelte } from "./script.js";
import type * as SvAST from "./svelte-ast-types.js";
import type * as Compiler from "./svelte-ast-types-for-v5.js";
import { sortNodes } from "./sort.js";
import { parseTemplate } from "./template.js";
import {
  analyzePropsScope,
  analyzeReactiveScope,
  analyzeSnippetsScope,
  analyzeStoreScope,
} from "./analyze-scope.js";
import { ParseError } from "../errors.js";
import {
  parseTypeScript,
  parseTypeScriptInSvelte,
} from "./typescript/index.js";
import { addReference } from "../scope/index.js";
import {
  parseStyleContext,
  type StyleContext,
  type StyleContextNoStyleElement,
  type StyleContextParseError,
  type StyleContextSuccess,
  type StyleContextUnknownLang,
  styleNodeLoc,
  styleNodeRange,
} from "./style-context.js";
import { getGlobalsForSvelte, getGlobalsForSvelteScript } from "./globals.js";
import type { NormalizedParserOptions } from "./parser-options.js";
import { getLanguage, normalizeParserOptions } from "./parser-options.js";
import { getFragmentFromRoot } from "./compat.js";
import {
  isEnableRunes,
  resolveSvelteParseContextForSvelte,
  resolveSvelteParseContextForSvelteScript,
  type SvelteParseContext,
} from "./svelte-parse-context.js";
import type { SvelteConfig } from "../svelte-config/index.js";
import { resolveSvelteConfigFromOption } from "../svelte-config/index.js";

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
          isSvelteScript: false;
          getSvelteHtmlAst: () => SvAST.Fragment | Compiler.Fragment;
          getStyleContext: () => StyleContext;
          svelteParseContext: SvelteParseContext;
        }
      | {
          isSvelte: false;
          isSvelteScript: true;
          svelteParseContext: SvelteParseContext;
        }
    );
  visitorKeys: { [type: string]: string[] };
  scopeManager: ScopeManager;
};
/**
 * Parse source code
 */
export function parseForESLint(code: string, options?: any): ParseResult {
  const svelteConfig = resolveSvelteConfigFromOption(options);
  const parserOptions = normalizeParserOptions(options);

  if (
    isEnableRunes(svelteConfig, parserOptions) &&
    parserOptions.filePath &&
    !parserOptions.filePath.endsWith(".svelte") &&
    // If no `filePath` is set in ESLint, "<input>" will be specified.
    parserOptions.filePath !== "<input>"
  ) {
    const trimmed = code.trim();
    if (!trimmed.startsWith("<") && !trimmed.endsWith(">")) {
      const svelteParseContext = resolveSvelteParseContextForSvelteScript(
        svelteConfig,
        parserOptions,
      );
      return parseAsScript(code, parserOptions, svelteParseContext);
    }
  }

  return parseAsSvelte(code, svelteConfig, parserOptions);
}

/**
 * Parse source code as svelte component
 */
function parseAsSvelte(
  code: string,
  svelteConfig: SvelteConfig | null,
  parserOptions: NormalizedParserOptions,
): ParseResult {
  const ctx = new Context(code, parserOptions);
  const resultTemplate = parseTemplate(
    ctx.sourceCode.template,
    ctx,
    parserOptions,
  );
  const svelteParseContext = resolveSvelteParseContextForSvelte(
    svelteConfig,
    parserOptions,
    resultTemplate.svelteAst,
  );

  const scripts = ctx.sourceCode.scripts;
  const language = ctx.getLanguage();

  const resultScript =
    language === "ts" || language === "jsdoc"
      ? parseTypeScriptInSvelte(
          scripts.getCurrentVirtualCodeInfo(),
          {
            ...scripts.attrs,
            lang: language === "jsdoc" ? "ts" : scripts.attrs.lang,
          },
          parserOptions,
          { slots: ctx.slots, svelteParseContext },
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
  analyzeSnippetsScope(ctx.snippets, resultScript.scopeManager!);

  // Add $$xxx variable
  addGlobalVariables(
    resultScript.scopeManager!,
    getGlobalsForSvelte(svelteParseContext),
  );

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
      analyzePropsScope(body, resultScript.scopeManager!, svelteParseContext);
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
    isSvelteScript: false,
    getSvelteHtmlAst() {
      return getFragmentFromRoot(resultTemplate.svelteAst);
    },
    getStyleContext() {
      if (styleContext === null) {
        styleContext = parseStyleContext(styleElement, ctx);
      }
      return styleContext;
    },
    styleNodeLoc,
    styleNodeRange,
    svelteParseContext,
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
  svelteParseContext: SvelteParseContext,
): ParseResult {
  const rawLang = parserOptions.filePath?.split(".").pop();
  const lang = getLanguage(parserOptions, rawLang, code);
  const resultScript =
    lang === "ts" || lang === "jsdoc"
      ? parseTypeScript(
          code,
          { lang: lang === "jsdoc" ? "ts" : rawLang },
          parserOptions,
          svelteParseContext,
        )
      : parseScript(code, { lang: rawLang }, parserOptions);

  // Add $$xxx variable
  addGlobalVariables(
    resultScript.scopeManager!,
    getGlobalsForSvelteScript(svelteParseContext),
  );

  resultScript.services = Object.assign(resultScript.services || {}, {
    isSvelte: false,
    isSvelteScript: true,
    svelteParseContext,
  });
  resultScript.visitorKeys = Object.assign({}, KEYS, resultScript.visitorKeys);
  return resultScript as any;
}

function addGlobalVariables(
  scopeManager: ScopeManager,
  globals: readonly string[],
) {
  const globalScope = scopeManager.globalScope;
  for (const globalName of globals) {
    if (globalScope.set.has(globalName)) continue;
    const variable = new Variable();
    variable.name = globalName;
    (variable as any).scope = globalScope;
    globalScope.variables.push(variable);
    globalScope.set.set(globalName, variable);
    globalScope.through = globalScope.through.filter((reference) => {
      if (reference.identifier.name === globalName) {
        // Links the variable and the reference.
        // And this reference is removed from `Scope#through`.
        reference.resolved = variable;
        addReference(variable.references, reference);
        return false;
      }
      return true;
    });
  }
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
