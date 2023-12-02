export type AttributeToken = {
  key: AttributeKeyToken;
  value: AttributeValueToken | null;
};
export type AttributeKeyToken = {
  name: string;
  start: number;
  end: number;
};
export type AttributeValueToken = {
  value: string;
  quote: '"' | "'" | null;
  start: number;
  end: number;
};

const RE_IS_SPACE = /^\s$/u;

class State {
  public readonly code: string;

  public index: number;

  public curr: string | null = null;

  public constructor(code: string, index: number) {
    this.code = code;
    this.index = index;
    this.curr = code[index] || null;
  }

  public skipSpaces() {
    while (this.currIsSpace()) {
      this.index++;
      if (this.eof()) break;
    }
  }

  public currIsSpace() {
    return RE_IS_SPACE.test(this.curr || "");
  }

  public currIs(expect: string): any {
    return this.code.startsWith(expect, this.index);
  }

  public eof(): boolean {
    return this.index >= this.code.length;
  }

  public eat<E extends string>(expect: E) {
    if (!this.currIs(expect)) {
      return null;
    }
    this.index += expect.length;
    return expect;
  }

  public advance() {
    return (this.curr = this.code[++this.index] || null);
  }
}

/** Parse HTML attributes */
export function parseAttributes(
  code: string,
  startIndex: number,
): { attributes: AttributeToken[]; index: number } {
  const attributes: AttributeToken[] = [];

  const state = new State(code, startIndex);

  while (!state.eof()) {
    state.skipSpaces();
    if (state.currIs(">") || state.currIs("/>") || state.eof()) break;
    attributes.push(parseAttribute(state));
  }

  return { attributes, index: state.index };
}

/** Parse HTML attribute */
function parseAttribute(state: State): AttributeToken {
  // parse key
  const key = parseAttributeKey(state);
  state.skipSpaces();
  if (!state.eat("=")) {
    return {
      key,
      value: null,
    };
  }
  state.skipSpaces();
  if (state.eof()) {
    return {
      key,
      value: null,
    };
  }
  // parse value
  const value = parseAttributeValue(state);
  return {
    key,
    value,
  };
}

/** Parse HTML attribute key */
function parseAttributeKey(state: State): AttributeKeyToken {
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
  return {
    name: state.code.slice(start, end),
    start,
    end,
  };
}

/** Parse HTML attribute value */
function parseAttributeValue(state: State): AttributeValueToken {
  const start = state.index;
  const quote = state.eat('"') || state.eat("'");
  if (quote) {
    if (state.eof()) {
      return {
        value: quote,
        quote: null,
        start,
        end: state.index,
      };
    }
    let c: string | null;
    while ((c = state.curr)) {
      state.advance();
      if (c === quote) {
        const end = state.index;
        return {
          value: state.code.slice(start + 1, end - 1),
          quote,
          start,
          end,
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
  return {
    value: state.code.slice(start, end),
    quote: null,
    start,
    end,
  };
}
