import type { Node, Parser, Root } from "postcss";
import postcss from "postcss";
import { parse as SCSSparse } from "postcss-scss";

import type { Context } from "../context";
import type { SourceLocation, SvelteStyleElement } from "../ast";

export type StyleContext =
  | StyleContextNoStyleElement
  | StyleContextParseError
  | StyleContextSuccess
  | StyleContextUnknownLang;

export interface StyleContextNoStyleElement {
  status: "no-style-element";
}

export interface StyleContextParseError {
  status: "parse-error";
  sourceLang: string;
  error: any;
}

export interface StyleContextSuccess {
  status: "success";
  sourceLang: string;
  sourceAst: Root;
}

export interface StyleContextUnknownLang {
  status: "unknown-lang";
  sourceLang: string;
}

/**
 * Extracts style source from a SvelteStyleElement and parses it into a PostCSS AST.
 */
export function parseStyleContext(
  styleElement: SvelteStyleElement | undefined,
  ctx: Context
): StyleContext {
  if (!styleElement || !styleElement.endTag) {
    return { status: "no-style-element" };
  }
  let sourceLang = "css";
  for (const attribute of styleElement.startTag.attributes) {
    if (
      attribute.type === "SvelteAttribute" &&
      attribute.key.name === "lang" &&
      attribute.value.length > 0 &&
      attribute.value[0].type === "SvelteLiteral"
    ) {
      sourceLang = attribute.value[0].value;
    }
  }
  let parseFn: Parser<Root>, sourceAst: Root;
  switch (sourceLang) {
    case "css":
      parseFn = postcss.parse;
      break;
    case "scss":
      parseFn = SCSSparse;
      break;
    default:
      return { status: "unknown-lang", sourceLang };
  }
  const styleCode = ctx.code.slice(
    styleElement.startTag.range[1],
    styleElement.endTag.range[0]
  );
  try {
    sourceAst = parseFn(styleCode, {
      from: ctx.parserOptions.filePath,
    });
    // eslint-disable-next-line no-empty -- Catching errors is not a good way to go around this, a safe parser should be used instead.
  } catch {}
  fixPostCSSNodeLocation(
    sourceAst,
    styleElement.loc,
    styleElement.startTag.range[1]
  );
  sourceAst.walk((node) =>
    fixPostCSSNodeLocation(
      node,
      styleElement.loc,
      styleElement.startTag.range[1]
    )
  );
  return { status: "success", sourceLang, sourceAst };
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
