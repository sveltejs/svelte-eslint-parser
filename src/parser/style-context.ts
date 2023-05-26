import type { Node, Parser, Root } from "postcss";
import postcss from "postcss";
import { parse as SCSSparse } from "postcss-scss";

import type { Context } from "../context";
import type { SourceLocation, SvelteStyleElement } from "../ast";

export interface StyleContext {
  sourceLang: string | null;
  sourceAst: Root | null;
}

/**
 * Extracts style source from a SvelteStyleElement and parses it into a PostCSS AST.
 */
export function parseStyleContext(
  styleElement: SvelteStyleElement | undefined,
  ctx: Context
): StyleContext {
  const styleContext: StyleContext = {
    sourceLang: null,
    sourceAst: null,
  };
  if (!styleElement || !styleElement.endTag) {
    return styleContext;
  }
  styleContext.sourceLang = "css";
  for (const attribute of styleElement.startTag.attributes) {
    if (
      attribute.type === "SvelteAttribute" &&
      attribute.key.name === "lang" &&
      attribute.value.length > 0 &&
      attribute.value[0].type === "SvelteLiteral"
    ) {
      styleContext.sourceLang = attribute.value[0].value;
    }
  }
  let parseFn: Parser<Root>;
  switch (styleContext.sourceLang) {
    case "css":
      parseFn = postcss.parse;
      break;
    case "scss":
      parseFn = SCSSparse;
      break;
    default:
      return styleContext;
  }
  const styleCode = ctx.code.slice(
    styleElement.startTag.range[1],
    styleElement.endTag.range[0]
  );
  try {
    styleContext.sourceAst = parseFn(styleCode, {
      from: ctx.parserOptions.filePath,
    });
    // eslint-disable-next-line no-empty -- Catching errors is not a good way to go around this, a safe parser should be used instead.
  } catch {}
  fixPostCSSNodeLocation(
    styleContext.sourceAst,
    styleElement.loc,
    styleElement.startTag.range[1]
  );
  styleContext.sourceAst.walk((node) =>
    fixPostCSSNodeLocation(
      node,
      styleElement.loc,
      styleElement.startTag.range[1]
    )
  );
  return styleContext;
}

/**
 * Fixes PostCSS AST locations to be relative to the whole file instead of relative to the <style> element.
 */
function fixPostCSSNodeLocation(
  node: Node,
  styleElementLoc: SourceLocation,
  styleElementOffset: number
) {
  if (node.source?.start?.offset !== undefined) {
    node.source.start.offset += styleElementOffset;
  }
  if (node.source?.start?.line !== undefined) {
    node.source.start.line += styleElementLoc.start.line - 1;
  }
  if (node.source?.end?.offset !== undefined) {
    node.source.end.offset += styleElementOffset;
  }
  if (node.source?.end?.line !== undefined) {
    node.source.end.line += styleElementLoc.start.line - 1;
  }
}
