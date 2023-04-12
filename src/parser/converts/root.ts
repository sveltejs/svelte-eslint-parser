import type * as SvAST from "../svelte-ast-types";
import type {
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
import postcss from "postcss";

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
      body: null as any,
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
      const styleCode = ctx.code.slice(contentRange.start, contentRange.end);
      style.body = postcss.parse(styleCode);
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
