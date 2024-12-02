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

  public constructor(
    script: string,
    attrs: Record<string, string | undefined>,
  ) {
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
      this.raw.slice(start, end).replace(/[^\n\r ]/g, " ") +
      this.raw.slice(end);
    this.trimmedRaw =
      this.trimmedRaw.slice(0, start) +
      this.trimmedRaw.slice(start, end).replace(/[^\n\r ]/g, " ") +
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

  // ----- States ------
  private readonly state: { isTypeScript?: boolean } = {};

  private readonly blocks: Block[] = [];

  public constructor(code: string, parserOptions: NormalizedParserOptions) {
    this.code = code;
    this.parserOptions = parserOptions;
    this.locs = new LinesAndColumns(code);

    const spaces = code.replace(/[^\n\r ]/g, " ");

    let templateCode = "";
    let scriptCode = "";
    const scriptAttrs: Record<string, string | undefined> = {};

    let start = 0;
    for (const block of extractBlocks(code)) {
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
        scriptCode += spaces.slice(start, block.startTagRange[1]);
        start = block.startTagRange[1];
      } else {
        templateCode +=
          code.slice(start, block.contentRange[0]) +
          spaces.slice(block.contentRange[0], block.contentRange[1]);
        if (block.tag === "script") {
          scriptCode +=
            spaces.slice(start, block.contentRange[0]) +
            code.slice(...block.contentRange);
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
          scriptCode += spaces.slice(start, block.contentRange[1]);
        }
        start = block.contentRange[1];
      }
    }
    templateCode += code.slice(start);
    scriptCode += spaces.slice(start);

    this.sourceCode = {
      template: templateCode,
      scripts: new ScriptsSourceCode(scriptCode, scriptAttrs),
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
          : (element.name as SvelteName).name.toLowerCase();
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
}

type Block =
  | {
      tag: "script" | "style" | "template";
      originalTag: string;
      attrs: Compiler.Attribute[];
      selfClosing?: false;
      contentRange: [number, number];
      startTagRange: [number, number];
      endTagRange: [number, number];
    }
  | SelfClosingBlock;

type SelfClosingBlock = {
  tag: "script" | "style" | "template";
  originalTag: string;
  attrs: Compiler.Attribute[];
  selfClosing: true;
  startTagRange: [number, number];
};

/** Extract <script> blocks */
function* extractBlocks(code: string): IterableIterator<Block> {
  const startTagOpenRe = /<!--[\s\S]*?-->|<(script|style|template)([\s>])/giu;
  const endScriptTagRe = /<\/script>/giu;
  const endStyleTagRe = /<\/style>/giu;
  const endTemplateTagRe = /<\/template>/giu;
  let startTagOpenMatch;
  while ((startTagOpenMatch = startTagOpenRe.exec(code))) {
    const [, tag, nextChar] = startTagOpenMatch;
    if (!tag) {
      continue;
    }
    const startTagStart = startTagOpenMatch.index;
    let startTagEnd = startTagOpenRe.lastIndex;

    const lowerTag = tag.toLowerCase() as "script" | "style" | "template";

    let attrs: Compiler.Attribute[] = [];
    if (!nextChar.trim()) {
      const attrsData = parseAttributes(code, startTagOpenRe.lastIndex);
      attrs = attrsData.attributes;
      startTagEnd = attrsData.index;
      if (code[startTagEnd] === "/" && code[startTagEnd + 1] === ">") {
        yield {
          tag: lowerTag,
          originalTag: tag,
          attrs,
          selfClosing: true,
          startTagRange: [startTagStart, startTagEnd + 2],
        };
        continue;
      }
      if (code[startTagEnd] === ">") {
        startTagEnd++;
      } else {
        continue;
      }
    }
    const endTagRe =
      lowerTag === "script"
        ? endScriptTagRe
        : lowerTag === "style"
          ? endStyleTagRe
          : endTemplateTagRe;
    endTagRe.lastIndex = startTagEnd;
    const endTagMatch = endTagRe.exec(code);
    if (endTagMatch) {
      const endTagStart = endTagMatch.index;
      const endTagEnd = endTagRe.lastIndex;
      yield {
        tag: lowerTag,
        originalTag: tag,
        attrs,
        startTagRange: [startTagStart, startTagEnd],
        contentRange: [startTagEnd, endTagStart],
        endTagRange: [endTagStart, endTagEnd],
      };
      startTagOpenRe.lastIndex = endTagEnd;
    }
  }
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
      } else if (c === "\n") {
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
