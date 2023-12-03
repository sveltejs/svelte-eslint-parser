import type * as Compiler from "svelte/compiler";
import type ESTree from "estree";
import { getEspree } from "./espree";

const RE_IS_SPACE = /^\s$/u;

class State {
  public readonly code: string;

  public index: number;

  public constructor(code: string, index: number) {
    this.code = code;
    this.index = index;
  }

  public getCurr(): string | undefined {
    return this.code[this.index];
  }

  public skipSpaces(): void {
    while (this.currIsSpace()) {
      this.advance();
      if (this.eof()) break;
    }
  }

  public currIsSpace(): boolean {
    return RE_IS_SPACE.test(this.getCurr() || "");
  }

  public currIs(expect: string): boolean {
    return this.code.startsWith(expect, this.index);
  }

  public eof(): boolean {
    return this.index >= this.code.length;
  }

  public eat<E extends string>(expect: E): E | null {
    if (!this.currIs(expect)) {
      return null;
    }
    this.index += expect.length;
    return expect;
  }

  public advance(): string | undefined {
    this.index++;
    return this.getCurr();
  }
}

/** Parse HTML attributes */
export function parseAttributes(
  code: string,
  startIndex: number,
): {
  attributes: Compiler.Attribute[];
  index: number;
} {
  const attributes: Compiler.Attribute[] = [];

  const state = new State(code, startIndex);

  while (!state.eof()) {
    state.skipSpaces();
    if (state.currIs(">") || state.currIs("/>") || state.eof()) break;
    attributes.push(parseAttribute(state));
  }

  return { attributes, index: state.index };
}

/** Parse HTML attribute */
function parseAttribute(state: State): Compiler.Attribute {
  const start = state.index;
  // parse key
  const key = parseAttributeKey(state);
  const keyEnd = state.index;
  state.skipSpaces();
  if (!state.eat("=")) {
    return {
      type: "Attribute",
      name: key,
      value: true,
      start,
      end: keyEnd,
      metadata: null as any,
      parent: null,
    };
  }
  state.skipSpaces();
  if (state.eof()) {
    return {
      type: "Attribute",
      name: key,
      value: true,
      start,
      end: keyEnd,
      metadata: null as any,
      parent: null,
    };
  }
  // parse value
  const value = parseAttributeValue(state);
  return {
    type: "Attribute",
    name: key,
    value: [value],
    start,
    end: state.index,
    metadata: null as any,
    parent: null,
  };
}

/** Parse HTML attribute key */
function parseAttributeKey(state: State): string {
  const start = state.index;
  while (state.advance()) {
    if (
      state.currIs("=") ||
      state.currIs(">") ||
      state.currIs("/>") ||
      state.currIsSpace()
    ) {
      break;
    }
  }
  const end = state.index;
  return state.code.slice(start, end);
}

/** Parse HTML attribute value */
function parseAttributeValue(
  state: State,
): Compiler.Text | Compiler.ExpressionTag {
  const start = state.index;
  const quote = state.eat('"') || state.eat("'");

  const startBk = state.index;
  const expression = parseAttributeMustache(state);
  if (expression) {
    if (!quote || state.eat(quote)) {
      const end = state.index;
      return {
        type: "ExpressionTag",
        expression,
        start,
        end,
        metadata: null as any,
        parent: null,
      };
    }
  }
  state.index = startBk;

  if (quote) {
    if (state.eof()) {
      return {
        type: "Text",
        data: quote,
        raw: quote,
        start,
        end: state.index,
        parent: null,
      };
    }
    let c: string | undefined;
    while ((c = state.getCurr())) {
      state.advance();
      if (c === quote) {
        const end = state.index;
        const data = state.code.slice(start + 1, end - 1);
        return {
          type: "Text",
          data,
          raw: data,
          start: start + 1,
          end: end - 1,
          parent: null,
        };
      }
    }
  } else {
    while (state.advance()) {
      if (state.currIsSpace() || state.currIs(">") || state.currIs("/>")) {
        break;
      }
    }
  }
  const end = state.index;
  const data = state.code.slice(start, end);
  return {
    type: "Text",
    data,
    raw: data,
    start,
    end,
    parent: null,
  };
}

/** Parse mustache */
function parseAttributeMustache(state: State):
  | (ESTree.Expression & {
      start: number;
      end: number;
    })
  | null {
  if (!state.eat("{")) {
    return null;
  }
  // parse simple expression
  const leadingComments: ESTree.Comment[] = [];
  const startBk = state.index;
  state.skipSpaces();
  let start = state.index;
  while (!state.eof()) {
    if (state.eat("//")) {
      leadingComments.push(parseInlineComment(state.index - 2));
      state.skipSpaces();
      start = state.index;
      continue;
    }
    if (state.eat("/*")) {
      leadingComments.push(parseBlockComment(state.index - 2));
      state.skipSpaces();
      start = state.index;
      continue;
    }
    const stringQuote = state.eat('"') || state.eat("'");
    if (stringQuote) {
      skipString(stringQuote);
      state.skipSpaces();
      continue;
    }
    const endCandidate = state.index;
    state.skipSpaces();
    if (state.eat("}")) {
      const end = endCandidate;
      try {
        const expression = (
          getEspree().parse(state.code.slice(start, end), {
            ecmaVersion: "latest",
          }).body[0] as ESTree.ExpressionStatement
        ).expression;
        delete expression.range;
        return {
          ...expression,
          leadingComments,
          start,
          end,
        };
      } catch {
        break;
      }
    }
    state.advance();
  }
  state.index = startBk;
  return null;

  function parseInlineComment(tokenStart: number): ESTree.Comment & {
    start: number;
    end: number;
  } {
    const valueStart = state.index;
    let valueEnd: number | null = null;
    while (!state.eof()) {
      if (state.eat("\n")) {
        valueEnd = state.index - 1;
        break;
      }
      state.advance();
    }
    if (valueEnd == null) {
      valueEnd = state.index;
    }

    return {
      type: "Line",
      value: state.code.slice(valueStart, valueEnd),
      start: tokenStart,
      end: state.index,
    };
  }

  function parseBlockComment(tokenStart: number): ESTree.Comment & {
    start: number;
    end: number;
  } {
    const valueStart = state.index;
    let valueEnd: number | null = null;
    while (!state.eof()) {
      if (state.eat("*/")) {
        valueEnd = state.index - 2;
        break;
      }
      state.advance();
    }
    if (valueEnd == null) {
      valueEnd = state.index;
    }

    return {
      type: "Block",
      value: state.code.slice(valueStart, valueEnd),
      start: tokenStart,
      end: state.index,
    };
  }

  function skipString(stringQuote: string) {
    while (!state.eof()) {
      if (state.eat(stringQuote)) {
        break;
      }
      if (state.eat("\\")) {
        // escape
        state.advance();
      }
      state.advance();
    }
  }
}
