import type { Context } from "./context/index.js";

/**
 * Svelte parse errors.
 */
export class ParseError extends SyntaxError {
  public index: number;

  public lineNumber: number;

  public column: number;

  /**
   * Initialize this ParseError instance.
   */
  public constructor(message: string, offset: number, ctx: Context) {
    super(message);
    this.index = offset;
    const loc = ctx.getLocFromIndex(offset);
    this.lineNumber = loc.line;
    this.column = loc.column;
  }
}
