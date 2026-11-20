import assert from "assert";
import * as tsParser from "@typescript-eslint/parser";
import * as compiler from "svelte/compiler";
import { parseForESLint } from "../../../src/index.js";
import { svelteVersion } from "../../../src/parser/svelte-version.js";

function toCode(script: string): string {
  return `<script lang="ts">\n${script}\n</script>\n`;
}

function isRunes(script: string): boolean | undefined {
  const result = parseForESLint(toCode(script), {
    filePath: "test.svelte",
    parser: tsParser,
  });
  return result.services.svelteParseContext.runes;
}

function isRunesInSvelte(script: string): boolean {
  const result = compiler.compile(toCode(script), { filename: "test.svelte" });
  return (result.metadata as { runes: boolean }).runes;
}

describe("Runes mode detection from rune symbols", () => {
  if (!svelteVersion.gte(5)) {
    return;
  }

  describe("a rune name in a type does not turn on runes mode", () => {
    for (const script of [
      "let o: $state;",
      "let o = 1 as $state;",
      "let o = 1 satisfies $state;",
      "let o = <$state>1;",
      "type T = $state;",
      "interface I { a: $state }",
      "function f<T extends $state>(): $state { return 1 as any; }",
      "const f = <T,>() => 1; f<$state>();",
      "const f = <T,>() => 1; const g = f<$state>;",
      "let o: typeof $state.raw;",
      "class A implements $state {}",
      "abstract class A { abstract m(): $state; }",
      "namespace N { export type X = $state; }",
      "declare let o: $state;",
      "declare let { a = $state(1) }: any;",
      "declare function f(a: $state): void;",
      "import type { $state } from './x';",
      "import { type $state } from './x';",
      "type A = 1; export type { A as $state };",
    ]) {
      it(script, () => {
        assert.strictEqual(isRunesInSvelte(script), false);
        assert.strictEqual(isRunes(script), false);
      });
    }
  });

  describe("a rune in an expression turns on runes mode", () => {
    for (const script of [
      "let o = $state(1);",
      "type T = number; let o = $state(1);",
      "let o = $state(1) as number;",
      "let o = $state(1) satisfies number;",
      "let o = $state(1)!;",
      "let o = <number>$state(1);",
      "let o = $state<number>(1);",
      "let o: number = $state(1);",
      "let o = ($state.snapshot<number>)(1);",
      "class B {} class A extends B { constructor(override x = $state.snapshot(1)) { super(); } }",
      "export = $state.snapshot(1);",
    ]) {
      it(script, () => {
        assert.strictEqual(isRunesInSvelte(script), true);
        assert.strictEqual(isRunes(script), true);
      });
    }
  });
});
