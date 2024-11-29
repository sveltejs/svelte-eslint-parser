import { UniqueIdGenerator } from "../../context/unique.js";
import { RestoreContext } from "./restore.js";
import type { TSESParseForESLintResult } from "./types.js";

/**
 * Context for virtual TypeScript code.
 * See https://github.com/sveltejs/svelte-eslint-parser/blob/main/docs/internal-mechanism.md#scope-types
 */
export class VirtualTypeScriptContext {
  private readonly originalCode: string;

  public readonly restoreContext: RestoreContext;

  public script = "";

  private consumedIndex = 0;

  private readonly unique = new UniqueIdGenerator();

  public _beforeResult: TSESParseForESLintResult | null = null;

  public constructor(code: string) {
    this.originalCode = code;
    this.restoreContext = new RestoreContext(code);
  }

  public skipOriginalOffset(offset: number): void {
    this.consumedIndex += offset;
  }

  public skipUntilOriginalOffset(offset: number): void {
    this.consumedIndex = Math.max(offset, this.consumedIndex);
  }

  public appendOriginalToEnd(): void {
    this.appendOriginal(this.originalCode.length);
  }

  public appendOriginal(index: number): void {
    if (this.consumedIndex >= index) {
      return;
    }
    this.restoreContext.addOffset({
      original: this.consumedIndex,
      dist: this.script.length,
    });
    this.script += this.originalCode.slice(this.consumedIndex, index);
    this.consumedIndex = index;
  }

  public appendVirtualScript(virtualFragment: string): void {
    const start = this.script.length;
    this.script += virtualFragment;
    this.restoreContext.addVirtualFragmentRange(start, this.script.length);
  }

  public generateUniqueId(base: string): string {
    return this.unique.generate(base, this.originalCode, this.script);
  }
}
