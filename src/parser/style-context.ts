import type { Parser, Root } from "postcss";
import postcss from "postcss";
import { parse as SCSSparse } from "postcss-scss";

import type { Context } from "../context";
import type { SvelteStyleElement } from "../ast";

export interface StyleContext {
  sourceLang: string | null;
  sourceAst: Root | null;
  sourceParseError: unknown;
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
    sourceParseError: null,
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
  } catch (e: unknown) {
    styleContext.sourceParseError = e;
  }
  return styleContext;
}
