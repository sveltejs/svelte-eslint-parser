import type { Node, Parser, Root, Rule } from "postcss";
import postcss from "postcss";
import { parse as SCSSparse } from "postcss-scss";
// @ts-expect-error -- PostCSS does not have types for its tokenizer.
import postcssTokenize from "postcss/lib/tokenize";
// @ts-expect-error -- postcss-scss does not have types for its tokenizer.
import scssTokenize from "postcss-scss/lib/scss-tokenize";
import {
  default as selectorParser,
  type Node as SelectorNode,
  type Root as SelectorRoot,
} from "postcss-selector-parser";

import type { Context } from "../context/index.js";
import type { SourceLocation, SvelteStyleElement } from "../ast/index.js";

const RE_WHITESPACE = /\s/u;
const RE_NEWLINE = /[\n\f\r]/u;
const RE_IDENT_CHAR = /[\w-]/u;

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
  const styleCode = blankTopLevelCDOAndCDC(
    ctx.code.slice(
      styleElement.startTag.range[1],
      styleElement.endTag.range[0],
    ),
    sourceLang === "scss",
  );
  try {
    sourceAst = parseFn(styleCode, {
      from: ctx.parserOptions.filePath,
    });
  } catch (error) {
    return { status: "parse-error", sourceLang, error: error as Error };
  }
  const styleLineStartIndices = getPostCSSLineStartIndices(styleCode);
  fixPostCSSNodeLocation(sourceAst, styleElement, ctx, styleLineStartIndices);
  sourceAst.walk((node) => {
    fixPostCSSNodeLocation(node, styleElement, ctx, styleLineStartIndices);
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
  const selectorLineStartIndices = getPostCSSLineStartIndices(rule.selector);
  const sourceOffsets =
    ruleStart !== undefined
      ? getSelectorSourceOffsets(rule, ctx.code, ruleStart, isSCSS)
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
            // PostCSS gives the 1-based column of the last character, but for
            // the root it gives the column after the end.
            column:
              node.type === "root"
                ? node.source.end.column - 1
                : node.source.end.column,
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
    // `end.offset` is already the offset after the end (since PostCSS 8.4.29).
    node.source.end !== undefined ? node.source.end.offset : undefined,
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
 * Replaces `<!--` and `-->` between top-level rules with spaces, so that
 * PostCSS can parse the style source. In CSS these are single tokens (CDO and
 * CDC) that are ignored at the top level of a stylesheet, and the text between
 * them is normal CSS. Svelte's own CSS parser skips them in the same places.
 * See https://drafts.csswg.org/css-syntax-3/#consume-stylesheet-contents
 */
function blankTopLevelCDOAndCDC(code: string, isSCSS: boolean): string {
  if (!code.includes("<!--") && !code.includes("-->")) {
    return code;
  }
  const len = code.length;
  const ranges: [number, number][] = [];
  let depth = 0;
  let atRuleStart = true;
  let index = 0;
  while (index < len) {
    const c = code[index];
    if (RE_WHITESPACE.test(c)) {
      index++;
    } else if (code.startsWith("/*", index)) {
      const end = code.indexOf("*/", index + 2);
      index = end === -1 ? len : end + 2;
    } else if (isSCSS && code.startsWith("//", index)) {
      while (index < len && !RE_NEWLINE.test(code[index])) {
        index++;
      }
    } else if (
      depth === 0 &&
      atRuleStart &&
      (code.startsWith("<!--", index) || code.startsWith("-->", index))
    ) {
      const end = index + (c === "<" ? 4 : 3);
      ranges.push([index, end]);
      index = end;
    } else {
      atRuleStart = false;
      if (c === '"' || c === "'") {
        index++;
        while (index < len && code[index] !== c) {
          index += code[index] === "\\" ? 2 : 1;
        }
        index++;
      } else if (c === "\\") {
        index += 2;
      } else if (isUnquotedURLStart(code, index)) {
        // e.g. `url(http://example.com)`. `//` is not a comment here.
        const end = code.indexOf(")", index);
        index = end === -1 ? len : end + 1;
      } else {
        if (c === "{") {
          depth++;
        } else if (c === "}" || c === ";") {
          if (c === "}" && depth > 0) depth--;
          atRuleStart = depth === 0;
        }
        index++;
      }
    }
  }
  if (ranges.length === 0) {
    return code;
  }
  let result = "";
  let last = 0;
  for (const [start, end] of ranges) {
    result += code.slice(last, start) + " ".repeat(end - start);
    last = end;
  }
  return result + code.slice(last);
}

const RE_UNQUOTED_URL_START = /url\(\s*(?![\s"'])/iuy;

/** Checks whether an unquoted `url(...)` starts at the given index. */
function isUnquotedURLStart(code: string, index: number): boolean {
  if (index > 0 && RE_IDENT_CHAR.test(code[index - 1])) {
    return false;
  }
  RE_UNQUOTED_URL_START.lastIndex = index;
  return RE_UNQUOTED_URL_START.test(code);
}

/**
 * Fixes PostCSS AST locations to be relative to the whole file instead of relative to the <style> element.
 */
function fixPostCSSNodeLocation(
  node: Node,
  styleElement: SvelteStyleElement,
  ctx: Context,
  styleLineStartIndices: number[],
) {
  if (node.source?.start?.offset !== undefined) {
    node.source.start.offset += styleElement.startTag.range[1];
  }
  if (node.source?.end?.offset !== undefined) {
    node.source.end.offset += styleElement.startTag.range[1];
  }
  for (const position of [node.source?.start, node.source?.end]) {
    if (position?.line === undefined) {
      continue;
    }
    // PostCSS only ends lines at `\n`, so compute the line and column again
    // in the same way as ESLint (which also ends lines at `\r`, U+2028 and U+2029).
    const index =
      styleElement.startTag.range[1] +
      styleLineStartIndices[position.line - 1] +
      position.column -
      1;
    const loc = ctx.getLocFromIndex(index);
    position.line = loc.line;
    position.column = loc.column + 1;
  }
}

/**
 * Gets the start indices of the lines in the same way as PostCSS and postcss-selector-parser (which split lines only at `\n`).
 */
function getPostCSSLineStartIndices(code: string): number[] {
  const lineStartIndices = [0];
  let index = code.indexOf("\n");
  while (index >= 0) {
    lineStartIndices.push(index + 1);
    index = code.indexOf("\n", index + 1);
  }
  return lineStartIndices;
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
  const last = sourceOffsets.length - 1;
  // postcss-selector-parser can give a position after the end.
  return index <= last
    ? sourceOffsets[index]
    : sourceOffsets[last] + index - last;
}

/**
 * Gets the offset from the rule start of each character in `rule.selector`,
 * and of the end of `rule.selector`.
 * PostCSS removes some comments from `rule.selector`, so they can differ.
 */
function getSelectorSourceOffsets(
  rule: Rule,
  code: string,
  ruleStart: number,
  isSCSS: boolean,
): number[] {
  const selector = rule.selector;
  const raws = rule.raws.selector as { raw: string; scss?: string } | undefined;
  // postcss-scss keeps the source text in `scss` when it changes `raw`.
  const source = raws ? (raws.scss ?? raws.raw) : selector;
  if (source === selector || !code.startsWith(source, ruleStart)) {
    return Array.from({ length: selector.length + 1 }, (_, index) => index);
  }
  return (
    getOffsetsWithoutRemovedComments(source, selector, isSCSS) ??
    getOffsetsFromLineStarts(source, selector)
  );
}

/**
 * Gets the offset in the source text of each character in `rule.selector` and
 * of its end, by taking each line start from the source text.
 * This is only right when no comment is removed before a character on the same line.
 */
function getOffsetsFromLineStarts(source: string, selector: string): number[] {
  const sourceLineStartIndices = getPostCSSLineStartIndices(source);
  const offsets: number[] = [];
  let line = 0;
  let lineStart = 0;
  for (let index = 0; index <= selector.length; index++) {
    if (index > 0 && selector[index - 1] === "\n") {
      line++;
      lineStart = index;
    }
    offsets.push(
      (sourceLineStartIndices[line] ?? lineStart) + index - lineStart,
    );
  }
  return offsets;
}

/**
 * Removes comments from the source text of a selector in the same way as
 * `Parser#raw()` in PostCSS, and gets the offset of each character that is
 * left and of the end. Returns null if the result is not the given selector.
 */
function getOffsetsWithoutRemovedComments(
  source: string,
  selector: string,
  isSCSS: boolean,
): number[] | null {
  const tokenizer = (isSCSS ? scssTokenize : postcssTokenize)(
    { css: source },
    { ignoreErrors: true },
  );
  const tokens: [string, string][] = [];
  while (!tokenizer.endOfFile()) {
    tokens.push(tokenizer.nextToken());
  }
  const offsets: number[] = [];
  let value = "";
  let offset = 0;
  for (let index = 0; index < tokens.length; index++) {
    const [type, text] = tokens[index];
    const isKept =
      type === "comment"
        ? !isSafeCommentNeighbor(tokens[index - 1]) &&
          !isSafeCommentNeighbor(tokens[index + 1]) &&
          !value.endsWith(",")
        : type !== "space" || index !== tokens.length - 1;
    if (isKept) {
      for (let i = 0; i < text.length; i++) {
        offsets.push(offset + i);
      }
      value += text;
    }
    offset += text.length;
  }
  if (value !== selector) {
    return null;
  }
  offsets.push(offset);
  return offsets;
}

/**
 * Checks if PostCSS removes a comment next to the given token from the selector.
 */
function isSafeCommentNeighbor(token: [string, string] | undefined): boolean {
  return token === undefined || token[0] === "space";
}
