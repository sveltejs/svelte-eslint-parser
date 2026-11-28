import type { InstanceGenerics } from "../parser/typescript/analyze/component.js";
import type {
  Comment,
  Locations,
  Position,
  SvelteElement,
  SvelteHTMLElement,
  SvelteName,
  SvelteScriptElement,
  SvelteSnippetBlock,
  SvelteStyleElement,
  Token,
} from "../ast/index.js";
import type ESTree from "estree";
import type * as SvAST from "../parser/svelte-ast-types.js";
import type * as Compiler from "../parser/svelte-ast-types-for-v5.js";
import { ScriptLetContext } from "./script-let.js";
import { LetDirectiveCollections } from "./let-directive-collection.js";
import { parseAttributes } from "../parser/html.js";
import { sortedLastIndex } from "../utils/index.js";
import {
  isTypeScript,
  type NormalizedParserOptions,
} from "../parser/parser-options.js";

const RE_TAG_END_OR_BLANK_LINE = />\s*$|^\s*$/m;
const RE_WHITESPACE = /\s/u;
const RE_WORD_CHAR = /[\w$]/u;
const RE_SCRIPT_STYLE_TEMPLATE_TAG = /<(?:script|style|template)/u;

export class ScriptsSourceCode {
  private raw: string;

  private trimmedRaw: string;

  public readonly attrs: Record<string, string | undefined>;

  private _appendScriptLets: {
    separate: string;
    beforeSpaces: string;
    render: string;
    snippet: string;
    generics: string;
  } | null = null;

  public separateIndexes: number[] = [];

  /** Whether line breaks were put between script blocks on the same line. */
  public readonly hasInsertedLineBreaks: boolean;

  /** Indexes of the semicolons put between script blocks. */
  public readonly insertedSemicolonIndexes: readonly number[];

  public constructor(
    script: string,
    attrs: Record<string, string | undefined>,
    hasInsertedLineBreaks = false,
    insertedSemicolonIndexes: readonly number[] = [],
  ) {
    this.hasInsertedLineBreaks = hasInsertedLineBreaks;
    this.insertedSemicolonIndexes = insertedSemicolonIndexes;
    this.raw = script;
    this.trimmedRaw = script.trimEnd();
    this.attrs = attrs;
    this.separateIndexes = [script.length];
  }

  public getCurrentVirtualCode(): string {
    if (this._appendScriptLets == null) {
      return this.raw;
    }
    return (
      this.trimmedRaw +
      this._appendScriptLets.separate +
      this._appendScriptLets.beforeSpaces +
      this._appendScriptLets.render +
      this._appendScriptLets.snippet +
      this._appendScriptLets.generics
    );
  }

  public getCurrentVirtualCodeInfo(): {
    script: string;
    render: string;
    rootScope: string;
  } {
    if (this._appendScriptLets == null) {
      return { script: this.raw, render: "", rootScope: "" };
    }
    return {
      script: this.trimmedRaw + this._appendScriptLets.separate,
      render:
        this._appendScriptLets.beforeSpaces + this._appendScriptLets.render,
      rootScope:
        this._appendScriptLets.snippet + this._appendScriptLets.generics,
    };
  }

  public getCurrentVirtualCodeLength(): number {
    if (this._appendScriptLets == null) {
      return this.raw.length;
    }
    return (
      this.trimmedRaw.length +
      this._appendScriptLets.separate.length +
      this._appendScriptLets.beforeSpaces.length +
      this._appendScriptLets.render.length +
      this._appendScriptLets.snippet.length +
      this._appendScriptLets.generics.length
    );
  }

  public addLet(
    letCode: string,
    kind: "generics" | "snippet" | "render",
  ): { start: number; end: number } {
    if (this._appendScriptLets == null) {
      const currentLength = this.trimmedRaw.length;
      this.separateIndexes = [currentLength, currentLength + 1];
      const after = this.raw.slice(currentLength + 2);
      this._appendScriptLets = {
        separate: "\n;",
        beforeSpaces: after,
        render: "",
        snippet: "",
        generics: "",
      };
    }
    const start = this.getCurrentVirtualCodeLength();
    this._appendScriptLets[kind] += letCode;
    return {
      start,
      end: this.getCurrentVirtualCodeLength(),
    };
  }

  public stripCode(start: number, end: number): void {
    this.raw =
      this.raw.slice(0, start) +
      this.raw.slice(start, end).replace(/[^\n\r \u2028\u2029]/g, " ") +
      this.raw.slice(end);
    this.trimmedRaw =
      this.trimmedRaw.slice(0, start) +
      this.trimmedRaw.slice(start, end).replace(/[^\n\r \u2028\u2029]/g, " ") +
      this.trimmedRaw.slice(end);
  }
}

export type ContextSourceCode = {
  template: string;
  scripts: ScriptsSourceCode;
};
export class Context {
  public readonly code: string;

  public readonly parserOptions: NormalizedParserOptions;

  // ----- Source Code ------
  public readonly sourceCode: ContextSourceCode;

  public readonly tokens: Token[] = [];

  public readonly comments: Comment[] = [];

  private readonly locs: LinesAndColumns;

  private readonly locsMap = new Map<number, Position>();

  // ----- Context Data ------
  public readonly scriptLet: ScriptLetContext;

  public readonly letDirCollections = new LetDirectiveCollections();

  public readonly slots = new Set<SvelteHTMLElement>();

  public readonly elements = new Map<
    SvelteElement,
    | SvAST.InlineComponent
    | SvAST.Element
    | SvAST.Window
    | SvAST.Document
    | SvAST.Body
    | SvAST.Head
    | SvAST.Options
    | SvAST.SlotTemplate
    | SvAST.Slot
    | SvAST.Title
    | Compiler.ElementLike
  >();

  public readonly snippets: SvelteSnippetBlock[] = [];

  /**
   * Slotted children that are moved out of the component's `let:` scope.
   * Like svelte/compiler, each one gets its own scope, so that `getScope()`
   * on a node inside it does not reach the component's `let:` scope.
   */
  public readonly slottedChildren = new WeakSet();

  /** Syntactically valid `generics` attribute of the instance script. */
  public instanceGenerics: InstanceGenerics | null = null;

  /** Props type text of each component element, keyed by the element. */
  public readonly componentPropsTypes = new Map<SvelteElement, string>();

  // ----- States ------
  private readonly state: { isTypeScript?: boolean } = {};

  private readonly blocks: Block[] = [];

  /**
   * Ranges of skipped mustache tags that have text like `<script`.
   * If the scan ran too far over one of them, it may cover real markup.
   */
  public readonly skippedRanges: [number, number][];

  public constructor(
    code: string,
    parserOptions: NormalizedParserOptions,
    options: { skipMustaches?: boolean } = {},
  ) {
    this.code = code;
    this.parserOptions = parserOptions;
    this.locs = new LinesAndColumns(code);

    const spaces = code.replace(/[^\n\r ]/g, " ");
    // Keep U+2028 and U+2029 in the script code, because the script parser
    // counts them as line breaks when it computes the locations.
    const scriptSpaces = code.replace(/[^\n\r \u2028\u2029]/g, " ");

    let templateCode = "";
    let scriptCode = "";
    const scriptAttrs: Record<string, string | undefined> = {};

    let start = 0;
    let lastScriptEnd: number | null = null;
    let hasInsertedLineBreaks = false;
    const insertedSemicolonIndexes: number[] = [];
    const { blocks, skippedRanges } =
      (options.skipMustaches !== false && extractBlocks(code, true)) ||
      extractBlocks(code, false)!;
    this.skippedRanges = skippedRanges;
    for (const block of blocks) {
      if (block.tag === "template") {
        if (block.selfClosing) {
          continue;
        }
        const lang = block.attrs.find((attr) => attr.name === "lang");
        if (!lang || !Array.isArray(lang.value)) {
          continue;
        }
        const langValue = lang.value[0];
        if (
          !langValue ||
          langValue.type !== "Text" ||
          langValue.data === "html"
        ) {
          continue;
        }
      }
      this.blocks.push(block);

      if (block.selfClosing) {
        // Self-closing blocks are temporarily replaced with `<s---->` or `<t---->` tag
        // because the svelte compiler cannot parse self-closing block(script, style) tags.
        // It will be restored later in `convertHTMLElement()` processing.
        templateCode += `${code.slice(
          start,
          block.startTagRange[0] + 2 /* `<` and first letter */,
        )}${"-".repeat(
          block.tag.length - 1 /* skip first letter */,
        )}${code.slice(
          block.startTagRange[0] + 1 /* skip `<` */ + block.tag.length,
          block.startTagRange[1],
        )}`;
        scriptCode += scriptSpaces.slice(start, block.startTagRange[1]);
        start = block.startTagRange[1];
      } else {
        templateCode +=
          code.slice(start, block.contentRange[0]) +
          spaces.slice(block.contentRange[0], block.contentRange[1]);
        if (block.tag === "script") {
          let before = scriptSpaces.slice(start, block.contentRange[0]);
          if (
            lastScriptEnd != null &&
            !RE_LINE_BREAK.test(
              scriptSpaces.slice(lastScriptEnd, block.contentRange[0]),
            )
          ) {
            // Script blocks on the same line would run into each other, so put
            // a line break between them. The locations are fixed after parsing.
            before = `\n${before.slice(1)}`;
            hasInsertedLineBreaks = true;
          }
          if (lastScriptEnd != null) {
            // A script that starts with `(`, `[` or a template literal would
            // continue the last statement of the previous script, so put a
            // semicolon between them in place of the `>` of the start tag. It
            // is removed after parsing.
            before = `${before.slice(0, -1)};`;
            insertedSemicolonIndexes.push(block.contentRange[0] - 1);
          }
          scriptCode += before + code.slice(...block.contentRange);
          lastScriptEnd = block.contentRange[1];
          for (const attr of block.attrs) {
            if (Array.isArray(attr.value)) {
              const attrValue = attr.value[0];
              scriptAttrs[attr.name] =
                attrValue && attrValue.type === "Text"
                  ? attrValue.data
                  : undefined;
            }
          }
        } else {
          scriptCode += scriptSpaces.slice(start, block.contentRange[1]);
        }
        start = block.contentRange[1];
      }
    }
    templateCode += code.slice(start);
    scriptCode += scriptSpaces.slice(start);

    this.sourceCode = {
      template: templateCode,
      scripts: new ScriptsSourceCode(
        scriptCode,
        scriptAttrs,
        hasInsertedLineBreaks,
        insertedSemicolonIndexes,
      ),
    };
    this.scriptLet = new ScriptLetContext(this);
  }

  public getLocFromIndex(index: number): { line: number; column: number } {
    let loc = this.locsMap.get(index);
    if (!loc) {
      loc = this.locs.getLocFromIndex(index);
      this.locsMap.set(index, loc);
    }
    return {
      line: loc.line,
      column: loc.column,
    };
  }

  public getIndexFromLoc(loc: { line: number; column: number }): number {
    return this.locs.getIndexFromLoc(loc);
  }

  /**
   * Get the location information of the given node.
   * @param node The node.
   */
  public getConvertLocation(
    node: { start: number; end: number } | ESTree.Node,
  ): Locations {
    const { start, end } = node as any;

    return {
      range: [start, end],
      loc: {
        start: this.getLocFromIndex(start),
        end: this.getLocFromIndex(end),
      },
    };
  }

  public addComment(comment: Comment): void {
    this.comments.push(comment);
  }

  /**
   * Add token to tokens
   */
  public addToken(
    type: Token["type"],
    range: { start: number; end: number },
  ): Token {
    const token = {
      type,
      value: this.getText(range),
      ...this.getConvertLocation(range),
    };
    this.tokens.push(token);
    return token;
  }

  /**
   * get text
   */
  public getText(range: { start: number; end: number } | ESTree.Node): string {
    return this.code.slice((range as any).start, (range as any).end);
  }

  public isTypeScript(): boolean {
    if (this.state.isTypeScript != null) {
      return this.state.isTypeScript;
    }
    const lang = this.sourceCode.scripts.attrs.lang;
    return (this.state.isTypeScript = isTypeScript(this.parserOptions, lang));
  }

  public stripScriptCode(start: number, end: number): void {
    this.sourceCode.scripts.stripCode(start, end);
  }

  public findBlock(
    element: SvelteScriptElement | SvelteStyleElement | SvelteElement,
  ): Block | undefined {
    const tag =
      element.type === "SvelteScriptElement"
        ? "script"
        : element.type === "SvelteStyleElement"
          ? "style"
          : (element.name as SvelteName).name;
    return this.blocks.find(
      (block) =>
        block.tag === tag &&
        !block.selfClosing &&
        element.range[0] <= block.contentRange[0] &&
        block.contentRange[1] <= element.range[1],
    );
  }

  public findSelfClosingBlock(
    element: SvelteElement,
  ): SelfClosingBlock | undefined {
    return this.blocks.find((block): block is SelfClosingBlock =>
      Boolean(
        block.selfClosing &&
        element.startTag.range[0] <= block.startTagRange[0] &&
        block.startTagRange[1] <= element.startTag.range[1],
      ),
    );
  }

  /**
   * In the script code, the `</script>` tag and the rest of its line are blanked with spaces.
   * So a line comment at the end of a script runs over them.
   * Cut such a comment at the end of the script content.
   */
  public fixLineCommentsAtScriptEnd(comments: Comment[]): void {
    for (const comment of comments) {
      if (comment.type !== "Line") continue;
      const block = this.blocks.find(
        (block): block is Exclude<Block, SelfClosingBlock> =>
          block.tag === "script" &&
          !block.selfClosing &&
          block.contentRange[0] <= comment.range[0] &&
          comment.range[0] < block.contentRange[1],
      );
      if (!block || comment.range[1] <= block.contentRange[1]) continue;
      const end = block.contentRange[1];
      comment.range[1] = end;
      comment.value = this.code.slice(comment.range[0] + 2, end);
      comment.loc.end = this.getLocFromIndex(end);
    }
  }
}

type Block =
  | {
      tag: "script" | "style" | "template";
      attrs: Compiler.Attribute[];
      selfClosing?: false;
      contentRange: [number, number];
      startTagRange: [number, number];
      endTagRange: [number, number];
    }
  | SelfClosingBlock;

type SelfClosingBlock = {
  tag: "script" | "style" | "template";
  attrs: Compiler.Attribute[];
  selfClosing: true;
  startTagRange: [number, number];
};

function isValidStartTagOpenIndex(
  code: string,
  startTagOpenIndex: number,
): boolean {
  const prev = code.slice(0, startTagOpenIndex);
  return RE_TAG_END_OR_BLANK_LINE.test(prev);
}

const RE_LINE_BREAK = /[\n\r\u2028\u2029]/u;

// `/` after a `{`, `:`, `@` or `#` tag such as `{#if` or `{:else if` can start
// a regexp, but `/` right after `{` is a closing tag such as `{/if}`.
const RE_TAG_START = /\s*[#:@][a-z]+(?:\s+if\b)?/uy;
const RE_WORD = /[\w$]+/uy;
// A `/` after one of these characters or keywords starts a regexp.
const REGEXP_PREFIX_CHARS = "(,=:[!&|?{;+-*/%<>~^";
const REGEXP_PREFIX_KEYWORDS = new Set([
  "await",
  "case",
  "delete",
  "do",
  "else",
  "in",
  "instanceof",
  "new",
  "of",
  "return",
  "throw",
  "typeof",
  "void",
  "yield",
]);

/**
 * Find the index after the `}` that closes the mustache tag at `start`.
 * Returns `null` if it is not closed.
 * It guesses whether a `/` starts a regexp from the token before it, so it
 * can be wrong, for example with `if (a) /{/`. Then it can stop early or run
 * too far. `parseTemplateWithContext()` falls back when it runs too far.
 */
function findMustacheEnd(code: string, start: number): number | null {
  // `true` for `${` in a template literal, `false` for `{`.
  const braces: boolean[] = [];
  let index = start + 1;
  let regexpAllowed = false;
  RE_TAG_START.lastIndex = index;
  const tag = RE_TAG_START.exec(code);
  if (tag) {
    index += tag[0].length;
    regexpAllowed = true;
  }
  let afterDot = false;
  // A `/` before this index is a division. This keeps the scan linear.
  let divisionEnd = 0;
  while (index < code.length) {
    const c = code[index];
    let next: number | null = index + 1;
    if (RE_WHITESPACE.test(c)) {
      index = next;
      continue;
    }
    if (c === "/" && code[index + 1] === "/") {
      next = index + 2;
      while (next < code.length && !RE_LINE_BREAK.test(code[next])) next++;
      index = next;
      continue;
    }
    if (c === "/" && code[index + 1] === "*") {
      const commentEnd = code.indexOf("*/", index + 2);
      if (commentEnd < 0) return null;
      index = commentEnd + 2;
      continue;
    }
    // Whether a `/` after this token starts a regexp.
    let allowed = false;
    if (c === "{") {
      braces.push(false);
      allowed = true;
    } else if (c === "}") {
      if (!braces.length) return index + 1;
      if (braces.pop()) {
        next = skipTemplateLiteral(code, index + 1, braces);
        // A regexp can start after `${`.
        allowed = next != null && code[next - 1] === "{";
      }
    } else if (c === "'" || c === '"') {
      next = skipString(code, index);
    } else if (c === "`") {
      next = skipTemplateLiteral(code, index + 1, braces);
      allowed = next != null && code[next - 1] === "{";
    } else if (c === "/" && regexpAllowed && index >= divisionEnd) {
      const end = skipRegExp(code, index);
      if (end < 0) {
        // There is no closing `/` on the line, so take it as a division, and
        // the rest of the line too.
        divisionEnd = -end;
        allowed = true;
      } else {
        next = end;
      }
    } else if (RE_WORD_CHAR.test(c)) {
      RE_WORD.lastIndex = index;
      RE_WORD.test(code);
      next = RE_WORD.lastIndex;
      allowed =
        !afterDot && REGEXP_PREFIX_KEYWORDS.has(code.slice(index, next));
    } else {
      allowed = REGEXP_PREFIX_CHARS.includes(c);
    }
    if (next == null) return null;
    afterDot = c === ".";
    regexpAllowed = allowed;
    index = next;
  }
  return null;
}

/**
 * Skip a regexp literal that starts with the `/` at `start`.
 * Returns the index after the closing `/`. If it is not closed on the line,
 * returns the index of the end of the line, negated.
 */
function skipRegExp(code: string, start: number): number {
  let inClass = false;
  let index = start + 1;
  while (index < code.length) {
    const c = code[index];
    if (RE_LINE_BREAK.test(c)) return -index;
    if (c === "\\") {
      index++;
      if (index < code.length && RE_LINE_BREAK.test(code[index])) {
        return -index;
      }
    } else if (c === "[") {
      inClass = true;
    } else if (c === "]") {
      inClass = false;
    } else if (c === "/" && !inClass) {
      return index + 1;
    }
    index++;
  }
  return -code.length;
}

/**
 * Skip a string literal that starts with the quote at `start`.
 * Returns the index after the closing quote, or `null` if it is not closed.
 */
function skipString(code: string, start: number): number | null {
  const quote = code[start];
  let index = start + 1;
  while (index < code.length) {
    const c = code[index];
    if (c === "\\") {
      index += code.startsWith("\r\n", index + 1) ? 3 : 2;
    } else if (c === quote) {
      return index + 1;
    } else if (c === "\n" || c === "\r") {
      return null;
    } else {
      index++;
    }
  }
  return null;
}

/**
 * Skip the rest of a template literal from `start`.
 * Returns the index after the closing backquote, or the index after `${`.
 * In the second case, `true` is pushed to `braces`.
 * Returns `null` if the template literal is not closed.
 */
function skipTemplateLiteral(
  code: string,
  start: number,
  braces: boolean[],
): number | null {
  let index = start;
  while (index < code.length) {
    const c = code[index];
    if (c === "\\") {
      index += 2;
    } else if (c === "`") {
      return index + 1;
    } else if (c === "$" && code[index + 1] === "{") {
      braces.push(true);
      return index + 2;
    } else {
      index++;
    }
  }
  return null;
}

/**
 * Extract <script> blocks.
 * If `skipMustaches` is `true`, mustache tags are skipped, and the ranges of
 * skipped mustache tags that have text like `<script` are returned too.
 * Returns `null` if a mustache tag is not closed or has `<!--` in it.
 */
function extractBlocks(
  code: string,
  skipMustaches: boolean,
): { blocks: Block[]; skippedRanges: [number, number][] } | null {
  const blocks: Block[] = [];
  const skippedRanges: [number, number][] = [];
  const startTagOpenRe = /<!--[\s\S]*?-->|\{|<(script|style|template)([\s>])/gu;
  const endScriptTagRe = /<\/script>/gu;
  const endStyleTagRe = /<\/style>/gu;
  const endTemplateTagRe = /<\/template>/gu;
  let startTagOpenMatch;
  while ((startTagOpenMatch = startTagOpenRe.exec(code))) {
    const [match, tag, nextChar] = startTagOpenMatch;
    if (match === "{") {
      // Skip a mustache tag, so that `<script>` in a string is not a block.
      if (skipMustaches) {
        const start = startTagOpenMatch.index;
        const end = findMustacheEnd(code, start);
        if (end == null) return null;
        const text = code.slice(start, end);
        // `startTagOpenRe` would start a comment at `<!--` here.
        // Leave such a file as before.
        if (text.includes("<!--")) return null;
        startTagOpenRe.lastIndex = end;
        // Only these ranges can change which blocks are extracted.
        if (RE_SCRIPT_STYLE_TEMPLATE_TAG.test(text)) {
          skippedRanges.push([start, end]);
        }
      }
      continue;
    }
    if (!tag) {
      continue;
    }
    const startTagStart = startTagOpenMatch.index;
    if (!isValidStartTagOpenIndex(code, startTagStart)) {
      continue;
    }

    let startTagEnd = startTagOpenRe.lastIndex;

    const blockTag = tag as "script" | "style" | "template";

    let attrs: Compiler.Attribute[] = [];
    if (!nextChar.trim()) {
      const attrsData = parseAttributes(code, startTagOpenRe.lastIndex);
      attrs = attrsData.attributes;
      startTagEnd = attrsData.index;
      if (code[startTagEnd] === "/" && code[startTagEnd + 1] === ">") {
        blocks.push({
          tag: blockTag,
          attrs,
          selfClosing: true,
          startTagRange: [startTagStart, startTagEnd + 2],
        });
        continue;
      }
      if (code[startTagEnd] === ">") {
        startTagEnd++;
      } else {
        continue;
      }
    }
    const endTagRe =
      blockTag === "script"
        ? endScriptTagRe
        : blockTag === "style"
          ? endStyleTagRe
          : endTemplateTagRe;
    endTagRe.lastIndex = startTagEnd;
    const endTagMatch = endTagRe.exec(code);
    if (endTagMatch) {
      const endTagStart = endTagMatch.index;
      const endTagEnd = endTagRe.lastIndex;
      blocks.push({
        tag: blockTag,
        attrs,
        startTagRange: [startTagStart, startTagEnd],
        contentRange: [startTagEnd, endTagStart],
        endTagRange: [endTagStart, endTagEnd],
      });
      startTagOpenRe.lastIndex = endTagEnd;
    }
  }
  return { blocks, skippedRanges };
}

export class LinesAndColumns {
  private readonly lineStartIndices: number[];

  public constructor(code: string) {
    const len = code.length;
    const lineStartIndices = [0];
    for (let index = 0; index < len; index++) {
      const c = code[index];
      if (c === "\r") {
        const next = code[index + 1] || "";
        if (next === "\n") {
          index++;
        }
        lineStartIndices.push(index + 1);
      } else if (c === "\n" || c === "\u2028" || c === "\u2029") {
        lineStartIndices.push(index + 1);
      }
    }
    this.lineStartIndices = lineStartIndices;
  }

  public getLocFromIndex(index: number): { line: number; column: number } {
    const lineNumber = sortedLastIndex(
      this.lineStartIndices,
      (target) => target - index,
    );
    return {
      line: lineNumber,
      column: index - this.lineStartIndices[lineNumber - 1],
    };
  }

  public getIndexFromLoc(loc: { line: number; column: number }): number {
    const lineStartIndex = this.lineStartIndices[loc.line - 1];
    const positionIndex = lineStartIndex + loc.column;

    return positionIndex;
  }

  /**
   * Get the location information of the given indexes.
   */
  public getLocations(start: number, end: number): Locations {
    return {
      range: [start, end],
      loc: {
        start: this.getLocFromIndex(start),
        end: this.getLocFromIndex(end),
      },
    };
  }
}
