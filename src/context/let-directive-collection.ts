import type { SvelteLetDirective, SvelteName } from "../ast";
import type * as ESTree from "estree";
import type { ScriptLetBlockParam, ScriptLetCallback } from "./script-let";

/** A class that collects pattern nodes for Let directives. */
export class LetDirectiveCollection {
  private readonly list: ScriptLetBlockParam[] = [];

  public getLetParams(): ScriptLetBlockParam[] {
    return this.list;
  }

  public addPattern(
    pattern: ESTree.Pattern | SvelteName,
    directive: SvelteLetDirective,
    typing: string,
    ...callbacks: ScriptLetCallback<ESTree.Pattern>[]
  ): ScriptLetCallback<ESTree.Pattern>[] {
    this.list.push({
      node: pattern,
      parent: directive,
      typing,
      callback(node, options) {
        for (const callback of callbacks) {
          callback(node, options);
        }
      },
    });
    return callbacks;
  }
}
export class LetDirectiveCollections {
  private readonly stack: LetDirectiveCollection[] = [];

  public beginExtract(): void {
    this.stack.push(new LetDirectiveCollection());
  }

  public getCollection(): LetDirectiveCollection {
    return this.stack[this.stack.length - 1];
  }

  public extract(): LetDirectiveCollection {
    return this.stack.pop()!;
  }
}
