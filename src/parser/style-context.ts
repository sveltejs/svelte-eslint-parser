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
export function parseSelector(
  rule: Rule,
  ctx: Context,
  isSCSS: boolean,
): SelectorRoot {
  const processor = selectorParser();
  const root = processor.astSync(rule.selector);
  const ruleStart = rule.source?.start?.offset;
  const ruleEnd = rule.source?.end?.offset;
  const selectorLineStartIndices = getLineStartIndices(rule.selector);
  const sourceOffsets =
    ruleStart !== undefined && ruleEnd !== undefined
      ? getSelectorSourceOffsets(
          rule.selector,
          ctx.code.slice(ruleStart, ruleEnd),
          isSCSS,
        )
      : null;
  fixSelectorNodeLocation(
    root,
    ctx,
    ruleStart,
    selectorLineStartIndices,
    sourceOffsets,
  );
  root.walk((node) => {
    fixSelectorNodeLocation(
      node,
      ctx,
      ruleStart,
      selectorLineStartIndices,
      sourceOffsets,
    );
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
function fixSelectorNodeLocation(
  node: SelectorNode,
  ctx: Context,
  ruleStart: number | undefined,
  selectorLineStartIndices: number[],
  sourceOffsets: number[] | null,
) {
  if (node.source === undefined) {
    return;
  }
  if (ruleStart === undefined || sourceOffsets === null) {
    node.source.start = undefined;
    node.source.end = undefined;
    return;
  }
  // postcss-selector-parser only ends lines at `\n`, so compute the line and
  // column again from the offset in the same way as ESLint.
  if (node.source.start !== undefined) {
    const index =
      selectorLineStartIndices[node.source.start.line - 1] +
      node.source.start.column -
      1;
    const loc = ctx.getLocFromIndex(
      ruleStart + getSourceOffset(sourceOffsets, index),
    );
    node.source.start = { line: loc.line, column: loc.column + 1 };
  }
  if (node.source.end !== undefined) {
    // The end column is the column of the last character.
    const index =
      selectorLineStartIndices[node.source.end.line - 1] +
      node.source.end.column -
      1;
    const loc = ctx.getLocFromIndex(
      ruleStart + getSourceOffset(sourceOffsets, index) + 1,
    );
    node.source.end = { line: loc.line, column: loc.column };
  }
}

/**
 * Gets the offset in the source text of the given index in `rule.selector`.
 */
function getSourceOffset(sourceOffsets: number[], index: number): number {
  if (index < sourceOffsets.length) {
    return sourceOffsets[index];
  }
  // postcss-selector-parser can give a position after the end.
  return (
    sourceOffsets[sourceOffsets.length - 1] + 1 + index - sourceOffsets.length
  );
}

/**
 * Gets the offset in the source text of each character in `rule.selector`.
 * PostCSS removes some comments from `rule.selector`, so they can differ.
 */
function getSelectorSourceOffsets(
  selector: string,
  source: string,
  isSCSS: boolean,
): number[] {
  const offsets: number[] = [];
  let offset = 0;
  let quote: string | null = null;
  let escaped = false;
  // The end of a comment that is also in the selector.
  let keptCommentEnd = 0;
  for (let index = 0; index < selector.length; index++) {
    if (!quote && !escaped && offset >= keptCommentEnd) {
      // Skip the comments that are not in the selector.
      for (;;) {
        const commentEnd = getCommentEnd(source, offset, isSCSS);
        if (
          commentEnd === -1 ||
          // postcss-scss does not take `//` in `url()` as a comment.
          (source.startsWith("//", offset) && selector.startsWith("//", index))
        ) {
          break;
        }
        if (selector.startsWith(source.slice(offset, commentEnd), index)) {
          keptCommentEnd = commentEnd;
          break;
        }
        offset = commentEnd;
      }
    }
    offsets.push(offset);
    const c = source[offset];
    if (offset < keptCommentEnd) {
      // Inside a comment.
    } else if (escaped) {
      escaped = false;
    } else if (c === "\\" && source[offset + 1] !== "/") {
      // PostCSS does not take `\/` as an escape, so `\/*` starts a comment.
      escaped = true;
    } else if (quote) {
      if (c === quote) {
        quote = null;
      }
    } else if (c === '"' || c === "'") {
      quote = c;
    }
    offset++;
  }
  return offsets;
}

/**
 * Gets the end offset of the comment at the given offset, or -1 if there is no comment.
 * `//` comments are only for SCSS.
 */
function getCommentEnd(code: string, offset: number, isSCSS: boolean): number {
  if (code.startsWith("/*", offset)) {
    const end = code.indexOf("*/", offset + 2);
    return end === -1 ? code.length : end + 2;
  }
  if (isSCSS && code.startsWith("//", offset)) {
    const end = code.slice(offset).search(/[\n\f\r]/u);
    return end === -1 ? code.length : offset + end;
  }
  return -1;
}

/**
 * Gets the start indices of the lines in the same way as postcss-selector-parser (which splits lines only at `\n`).
 */
function getLineStartIndices(code: string): number[] {
  const lineStartIndices = [0];
  let index = code.indexOf("\n");
  while (index >= 0) {
    lineStartIndices.push(index + 1);
    index = code.indexOf("\n", index + 1);
  }
  return lineStartIndices;
}
