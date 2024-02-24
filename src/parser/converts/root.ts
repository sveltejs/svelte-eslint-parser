import type * as SvAST from "../svelte-ast-types";
import type {
  SvelteAttribute,
  SvelteGenericsDirective,
  SvelteLiteral,
  SvelteName,
  SvelteProgram,
  SvelteScriptElement,
  SvelteStyleElement,
} from "../../ast";
import {} from "./common";
import type { Context } from "../../context";
import { convertChildren, extractElementTags } from "./element";
import { convertAttributeTokens } from "./attr";
import type { Scope } from "eslint-scope";
import { parseScriptWithoutAnalyzeScope } from "../script";
import type { TSESParseForESLintResult } from "../typescript/types";
import type * as ESTree from "estree";
import type { TSESTree } from "@typescript-eslint/types";
import { fixLocations } from "../../context/fix-locations";

/**
 * Convert root
 */
export function convertSvelteRoot(
  svelteAst: SvAST.Ast,
  ctx: Context,
): SvelteProgram {
  const ast: SvelteProgram = {
    type: "Program",
    body: [],
    comments: ctx.comments,
    sourceType: "module",
    tokens: ctx.tokens,
    parent: null,
    ...ctx.getConvertLocation({ start: 0, end: ctx.code.length }),
  };
  const body = ast.body;
  if (svelteAst.html) {
    const fragment = svelteAst.html;
    body.push(...convertChildren(fragment, ast, ctx));
  }
  if (svelteAst.instance) {
    const instance = svelteAst.instance;
    const script: SvelteScriptElement = {
      type: "SvelteScriptElement",
      name: null as any,
      startTag: null as any,
      body: [],
      endTag: null,
      parent: ast,
      ...ctx.getConvertLocation(instance),
    };
    extractAttributes(script, ctx);
    convertGenericsAttribute(script, ctx);
    extractElementTags(script, ctx, {
      buildNameNode: (openTokenRange) => {
        ctx.addToken("HTMLIdentifier", openTokenRange);
        const name: SvelteName = {
          type: "SvelteName",
          name: "script",
          parent: script,
          ...ctx.getConvertLocation(openTokenRange),
        };
        return name;
      },
    });
    body.push(script);
  }
  if (svelteAst.module) {
    const module = svelteAst.module;
    const script: SvelteScriptElement = {
      type: "SvelteScriptElement",
      name: null as any,
      startTag: null as any,
      body: [],
      endTag: null,
      parent: ast,
      ...ctx.getConvertLocation(module),
    };
    extractAttributes(script, ctx);
    extractElementTags(script, ctx, {
      buildNameNode: (openTokenRange) => {
        ctx.addToken("HTMLIdentifier", openTokenRange);
        const name: SvelteName = {
          type: "SvelteName",
          name: "script",
          parent: script,
          ...ctx.getConvertLocation(openTokenRange),
        };
        return name;
      },
    });
    body.push(script);
  }
  if (svelteAst.css) {
    const style: SvelteStyleElement = {
      type: "SvelteStyleElement",
      name: null as any,
      startTag: null as any,
      children: [] as any,
      endTag: null,
      parent: ast,
      ...ctx.getConvertLocation(svelteAst.css),
    };

    extractAttributes(style, ctx);
    extractElementTags(style, ctx, {
      buildNameNode: (openTokenRange) => {
        ctx.addToken("HTMLIdentifier", openTokenRange);
        const name: SvelteName = {
          type: "SvelteName",
          name: "style",
          parent: style,
          ...ctx.getConvertLocation(openTokenRange),
        };
        return name;
      },
    });

    if (style.endTag && style.startTag.range[1] < style.endTag.range[0]) {
      const contentRange = {
        start: style.startTag.range[1],
        end: style.endTag.range[0],
      };
      ctx.addToken("HTMLText", contentRange);
      style.children = [
        {
          type: "SvelteText",
          value: ctx.code.slice(contentRange.start, contentRange.end),
          parent: style,
          ...ctx.getConvertLocation(contentRange),
        },
      ];
    }

    body.push(style);
  }

  // Set the scope of the Program node.
  ctx.scriptLet.addProgramRestore(
    (
      node,
      _tokens,
      _comments,
      { scopeManager, registerNodeToScope, addPostProcess },
    ) => {
      const scopes: Scope[] = [];
      for (const scope of scopeManager.scopes) {
        if (scope.block === node) {
          registerNodeToScope(ast, scope);
          scopes.push(scope);
        }
      }
      addPostProcess(() => {
        // Reverts the node indicated by `block` to the original Program node.
        // This state is incorrect, but `eslint-utils`'s `referenceTracker.iterateEsmReferences()` tracks import statements
        // from Program nodes set to `block` in global scope. This can only be handled by the original Program node.
        scopeManager.globalScope.block = node;
      });
    },
  );

  return ast;
}

/** Extract attrs */
function extractAttributes(
  element: SvelteScriptElement | SvelteStyleElement,
  ctx: Context,
) {
  element.startTag = {
    type: "SvelteStartTag",
    attributes: [],
    selfClosing: false,
    parent: element,
    range: [element.range[0], null as any],
    loc: {
      start: {
        line: element.loc.start.line,
        column: element.loc.start.column,
      },
      end: null as any,
    },
  };
  const block = ctx.findBlock(element);
  if (block) {
    element.startTag.attributes.push(
      ...convertAttributeTokens(block.attrs, element.startTag, ctx),
    );
  }
}

/** Convert generics attribute */
function convertGenericsAttribute(script: SvelteScriptElement, ctx: Context) {
  const lang = ctx.sourceCode.scripts.attrs.lang;
  if (lang !== "ts" && lang !== "typescript") {
    return;
  }
  const genericsAttribute = script.startTag.attributes.find(
    (attr): attr is SvelteAttribute & { value: [SvelteLiteral] } => {
      return (
        attr.type === "SvelteAttribute" &&
        attr.key.name === "generics" &&
        attr.value.length === 1 &&
        attr.value[0].type === "SvelteLiteral"
      );
    },
  );
  if (!genericsAttribute) {
    return;
  }
  const value = genericsAttribute.value[0];
  delete (genericsAttribute as any).boolean;
  delete (genericsAttribute as any).value;

  // Remove value token indexes
  const firstTokenIndex = ctx.tokens.findIndex(
    (token) =>
      value.range[0] <= token.range[0] && token.range[1] <= value.range[1],
  );
  const lastTokenCount = ctx.tokens
    .slice(firstTokenIndex)
    .findIndex((token) => value.range[1] <= token.range[0]);
  ctx.tokens.splice(
    firstTokenIndex,
    lastTokenCount >= 0 ? lastTokenCount : Infinity,
  );

  const generics = genericsAttribute as any as SvelteGenericsDirective;
  generics.type = "SvelteGenericsDirective";
  generics.params = [];

  const genericValueCode = ctx.code.slice(value.range[0], value.range[1]);
  const scriptLet = `void function<${genericValueCode}>(){}`;
  const result = parseScriptWithoutAnalyzeScope(
    scriptLet,
    ctx.sourceCode.scripts.attrs,
    {
      ...ctx.parserOptions,
      // Without typings
      project: null,
    },
  ) as unknown as TSESParseForESLintResult;
  result.ast.tokens!.shift(); // void
  result.ast.tokens!.shift(); // function
  result.ast.tokens!.shift(); // <
  result.ast.tokens!.pop(); // }
  result.ast.tokens!.pop(); // {
  result.ast.tokens!.pop(); // )
  result.ast.tokens!.pop(); // (
  result.ast.tokens!.pop(); // >
  fixLocations(
    result.ast as any,
    result.ast.tokens! as any,
    result.ast.comments! as any,
    value.range[0] - 14,
    result.visitorKeys as any,
    ctx,
  );

  const { ast } = result;
  const statement = ast.body[0] as ESTree.ExpressionStatement;
  const rawExpression = statement.expression as ESTree.UnaryExpression;
  const classDecl = rawExpression.argument as ESTree.FunctionExpression;
  const typeParameters = (classDecl as TSESTree.FunctionExpression)
    .typeParameters!;
  const params = typeParameters.params;

  // Replace tokens
  for (const tokensKey of ["tokens", "comments"] as const) {
    const newTokens: any[] = [];
    for (const token of result.ast[tokensKey]!) {
      if (
        params.every(
          (param) =>
            token.range[1] <= param.range[0] ||
            param.range[1] <= token.range[0],
        )
      ) {
        newTokens.push(token);
      }
    }
    ctx[tokensKey].push(...newTokens);
  }

  for (const param of params) {
    ctx.scriptLet.addGenericTypeAliasDeclaration(
      param,
      (id, typeNode) => {
        param.name = id;
        if (param.constraint) {
          param.constraint = typeNode;
        }
      },
      (typeNode) => {
        param.default = typeNode;
      },
    );
    (param as any).parent = generics;
    generics.params.push(param);
  }
}
