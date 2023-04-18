import type * as SvAST from "../svelte-ast-types";
import type {
  SourceLocation,
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
import type { Document, Node, Parser, Root } from "postcss";
import postcss from "postcss";
import { parse as SCSSparse } from "postcss-scss";
import type { ESLintCompatiblePostCSSNode } from "../../ast/style";

/**
 * Convert root
 */
export function convertSvelteRoot(
  svelteAst: SvAST.Ast,
  ctx: Context
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
      body: undefined,
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
      let lang = "css";
      for (const attribute of style.startTag.attributes) {
        if (
          attribute.type === "SvelteAttribute" &&
          attribute.key.name === "lang" &&
          attribute.value.length > 0 &&
          attribute.value[0].type === "SvelteLiteral"
        ) {
          lang = attribute.value[0].value;
        }
      }
      let parseFn: Parser<Root> | undefined = postcss.parse;
      switch (lang) {
        case "css":
          parseFn = postcss.parse;
          break;
        case "scss":
          parseFn = SCSSparse;
          break;
        default:
          console.warn(`Unknown <style> block language "${lang}".`);
          parseFn = undefined;
      }
      const contentRange = {
        start: style.startTag.range[1],
        end: style.endTag.range[0],
      };
      const styleCode = ctx.code.slice(contentRange.start, contentRange.end);
      if (parseFn !== undefined) {
        // The assertion here is a bit of a lie, the body only becomes `ESLintCompatiblePostCSSNode` after the convertPostCSSNodeToESLintNode function has been called on it and all its descendants.
        style.body = parseFn(styleCode, {
          from: ctx.parserOptions.filePath,
        }) as unknown as ESLintCompatiblePostCSSNode<Root>;
        convertPostCSSNodeToESLintNode(style.body, style.loc, contentRange);
        // Fix Root loc
        style.body.loc.start.column += style.startTag.loc.end.column;
        style.body.loc.end.column -=
          style.endTag.loc.end.column - style.endTag.loc.start.column;
        style.body?.walk((node) =>
          convertPostCSSNodeToESLintNode(node, style.loc, contentRange)
        );
        style.body.parent = style as unknown as Document;
        delete style.body.source?.input.file;
      }
      ctx.addToken("HTMLText", contentRange);
      style.children = [
        {
          type: "SvelteText",
          value: styleCode,
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
      { scopeManager, registerNodeToScope, addPostProcess }
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
    }
  );

  return ast;
}

/**
 * Instruments PostCSS AST nodes to also be valid ESLint AST nodes.
 */
function convertPostCSSNodeToESLintNode<PostCSSNode extends Node>(
  node: ESLintCompatiblePostCSSNode<PostCSSNode>,
  styleLoc: SourceLocation,
  styleRange: { start: number; end: number }
) {
  node.type = `SvelteStyle-${node.type}`;
  const startOffset = styleRange.start + (node.source?.start?.offset ?? 0);
  const endOffset =
    node.source?.end !== undefined
      ? styleRange.start + node.source.end.offset
      : styleRange.end;
  node.range = [startOffset, endOffset];
  const startLine = styleLoc.start.line + (node.source?.start?.line ?? 0) - 1;
  const startColumn = node.source?.start?.column ?? 1;
  const endLine =
    node.source?.end !== undefined
      ? styleLoc.start.line + node.source.end.line - 1
      : styleLoc.end.line;
  const endColumn =
    node.source?.end !== undefined
      ? node.source.end.column
      : styleLoc.end.column;
  node.loc = {
    start: { line: startLine, column: startColumn },
    end: { line: endLine, column: endColumn },
  };
}

/** Extract attrs */
function extractAttributes(
  element: SvelteScriptElement | SvelteStyleElement,
  ctx: Context
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
      ...convertAttributeTokens(block.attrs, element.startTag, ctx)
    );
  }
}
