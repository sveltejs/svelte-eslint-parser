import type { Node, Parser, Root, Rule } from "postcss";
import postcss from "postcss";
import { parse as SCSSparse } from "postcss-scss";
import {
  default as selectorParser,
  type Node as SelectorNode,
  type Root as SelectorRoot,
} from "postcss-selector-parser";

import type { Context } from "../context/index.js";
import type { SourceLocation, SvelteStyleElement } from "../ast/index.js";

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
  error: Error;
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
  ctx: Context,
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
    case "postcss":
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
    styleElement.endTag.range[0],
  );
  try {
    sourceAst = parseFn(styleCode, {
      from: ctx.parserOptions.filePath,
    });
  } catch (error) {
    return { status: "parse-error", sourceLang, error: error as Error };
  }
  fixPostCSSNodeLocation(sourceAst, styleElement);
  sourceAst.walk((node) => {
    fixPostCSSNodeLocation(node, styleElement);
  });
  return { status: "success", sourceLang, sourceAst };
}

/**
 * Parses a PostCSS Rule node's selector and returns its AST.
 */
export function parseSelector(rule: Rule): SelectorRoot {
  const processor = selectorParser();
  const root = processor.astSync(rule.selector);
  fixSelectorNodeLocation(root, rule);
  root.walk((node) => {
    fixSelectorNodeLocation(node, rule);
  });
  return root;
}

/**
 * Extracts a node location (like that of any ESLint node) from a parsed svelte style node.
 */
export function styleNodeLoc(node: Node): Partial<SourceLocation> {
  if (node.source === undefined) {
    return {};
  }
  return {
    start:
      node.source.start !== undefined
        ? {
            line: node.source.start.line,
            column: node.source.start.column - 1,
          }
        : undefined,
    end:
      node.source.end !== undefined
        ? {
            line: node.source.end.line,
            column: node.source.end.column,
          }
        : undefined,
  };
}

/**
 * Extracts a node range (like that of any ESLint node) from a parsed svelte style node.
 */
export function styleNodeRange(
  node: Node,
): [number | undefined, number | undefined] {
  if (node.source === undefined) {
    return [undefined, undefined];
  }
  return [
    node.source.start !== undefined ? node.source.start.offset : undefined,
    node.source.end !== undefined ? node.source.end.offset + 1 : undefined,
  ];
}

/**
 * Extracts a node location (like that of any ESLint node) from a parsed svelte selector node.
 */
export function styleSelectorNodeLoc(
  node: SelectorNode,
): Partial<SourceLocation> {
  return {
    start:
      node.source?.start !== undefined
        ? {
            line: node.source.start.line,
            column: node.source.start.column - 1,
          }
        : undefined,
    end: node.source?.end,
  };
}

/**
 * Fixes PostCSS AST locations to be relative to the whole file instead of relative to the <style> element.
 */
function fixPostCSSNodeLocation(node: Node, styleElement: SvelteStyleElement) {
  if (node.source?.start?.offset !== undefined) {
    node.source.start.offset += styleElement.startTag.range[1];
  }
  if (node.source?.start?.line !== undefined) {
    node.source.start.line += styleElement.loc.start.line - 1;
  }
  if (node.source?.end?.offset !== undefined) {
    node.source.end.offset += styleElement.startTag.range[1];
  }
  if (node.source?.end?.line !== undefined) {
    node.source.end.line += styleElement.loc.start.line - 1;
  }
  if (node.source?.start?.line === styleElement.loc.start.line) {
    node.source.start.column += styleElement.startTag.loc.end.column;
  }
  if (node.source?.end?.line === styleElement.loc.start.line) {
    node.source.end.column += styleElement.startTag.loc.end.column;
  }
}

/**
 * Fixes selector AST locations to be relative to the whole file instead of relative to their parent rule.
 */
function fixSelectorNodeLocation(node: SelectorNode, rule: Rule) {
  if (node.source === undefined) {
    return;
  }
  const ruleLoc = styleNodeLoc(rule);

  if (node.source.start !== undefined && ruleLoc.start !== undefined) {
    if (node.source.start.line === 1) {
      node.source.start.column += ruleLoc.start.column;
    }
    node.source.start.line += ruleLoc.start.line - 1;
  } else {
    node.source.start = undefined;
  }

  if (node.source.end !== undefined && ruleLoc.start !== undefined) {
    if (node.source.end.line === 1) {
      node.source.end.column += ruleLoc.start.column;
    }
    node.source.end.line += ruleLoc.start.line - 1;
  } else {
    node.source.end = undefined;
  }
}
