import type { Locations, SveltePugTemplateElement, Token } from "../../ast";
import type { Context } from "../../context";

import type PugLexer from "pug-lexer";
import { ParseError } from "../..";

export class PugContext {
  private readonly startLoc: { line: number; column: number };

  private readonly templateElement: SveltePugTemplateElement;

  public readonly ctx: Context;

  private readonly pugTokens: PugLexer.Token[];

  public constructor(args: {
    startIndex: number;
    templateElement: SveltePugTemplateElement;
    ctx: Context;
    oldTokens: Token[];
    tokens: PugLexer.Token[];
  }) {
    this.startLoc = args.ctx.getLocFromIndex(args.startIndex);
    this.templateElement = args.templateElement;
    this.ctx = args.ctx;
    this.pugTokens = [...args.tokens];
  }

  public getSvelteLoc(loc: { line: number; column: number }): {
    line: number;
    column: number;
  } {
    if (loc.line === 1) {
      return {
        line: this.startLoc.line,
        column: this.startLoc.column + loc.column - 1,
      };
    }
    return {
      line: this.startLoc.line + loc.line - 1,
      column: loc.column - 1,
    };
  }

  public getSvelteIndex(loc: { line: number; column: number }): number {
    return this.ctx.getIndexFromLoc(this.getSvelteLoc(loc));
  }

  public getConvertLocation(locs: {
    start: {
      line: number;
      column: number;
    };
    end: {
      line: number;
      column: number;
    };
  }): Locations {
    const startLoc = this.getSvelteLoc(locs.start);
    const endLoc = this.getSvelteLoc(locs.end);
    return {
      range: [
        this.ctx.getIndexFromLoc(startLoc),
        this.ctx.getIndexFromLoc(endLoc),
      ],
      loc: {
        start: startLoc,
        end: endLoc,
      },
    };
  }

  public advanceToken(option: { skipSpaces: boolean }): void {
    let token = this.pugTokens.shift();
    if (option.skipSpaces) {
      while (
        token &&
        // skip whitespaces
        (token.type === "newline" ||
          token.type === "indent" ||
          token.type === "outdent")
      ) {
        token = this.pugTokens.shift();
      }
    }
  }

  public peekToken<T extends PugLexer.Token["type"]>(option: {
    skipSpaces: boolean;
    expected?: T[];
  }): Extract<PugLexer.Token, { type: T }> {
    let index = 0;
    let token = this.pugTokens[index];
    let lastToken = token;
    if (option.skipSpaces) {
      while (
        token &&
        // skip whitespaces
        (token.type === "newline" ||
          token.type === "indent" ||
          token.type === "outdent")
      ) {
        lastToken = token;
        token = this.pugTokens[++index];
      }
    }
    if (!token) {
      throw new ParseError(
        `Expected token, but token not found.`,
        (lastToken ? this.getSvelteIndex(lastToken.loc.end) : null) ??
          this.templateElement.endTag?.range[0] ??
          this.templateElement.range[1],
        this.ctx
      );
    }
    if (
      option?.expected?.length &&
      !(option.expected as string[]).includes(token.type)
    ) {
      throw this.tokenError(token, option.expected);
    }
    return token as Extract<PugLexer.Token, { type: T }>;
  }

  public eatToken<T extends PugLexer.Token["type"]>(option: {
    skipSpaces: boolean;
    expected: T[];
  }): Extract<PugLexer.Token, { type: T }> | null {
    const token = this.peekToken({ skipSpaces: option.skipSpaces });
    if (!(option.expected as string[]).includes(token.type)) {
      return null;
    }

    this.advanceToken(option);
    return token as Extract<PugLexer.Token, { type: T }>;
  }

  public expectToken<T extends PugLexer.Token["type"]>(option: {
    skipSpaces: boolean;
    expected: T[];
  }): Extract<PugLexer.Token, { type: T }> {
    const token = this.peekToken(option);
    this.advanceToken(option);
    return token;
  }

  private tokenError(token: PugLexer.Token, expected: string[]): ParseError {
    const expectedList = expected.map((e) => JSON.stringify(e));
    const phrase =
      expectedList.length > 1
        ? `${expectedList.slice(0, -1).join(", ")} or ${
            expectedList[expectedList.length - 1]
          }`
        : expectedList[0];

    throw new ParseError(
      `Expected ${phrase} token, but "${token.type}" token found.`,
      this.getSvelteIndex(token.loc.start),
      this.ctx
    );
  }
}
