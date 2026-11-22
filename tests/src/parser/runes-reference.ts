import assert from "assert";
import * as tsParser from "@typescript-eslint/parser";
import { compile } from "svelte/compiler";
import { parseForESLint } from "../../../src/index.js";
import { svelteVersion } from "../../../src/parser/svelte-version.js";

type Case = {
  code: string;
  runes: boolean;
  /** The compiler throws this runes-only error instead of compiling the code. */
  compileError?: string;
};

/** Wraps the given code in a `<script>` tag. */
function script(code: string): string {
  return `<script>\n\t${code}\n</script>\n`;
}

/** Wraps the given code in a `<script lang="ts">` tag. */
function ts(code: string): string {
  return `<script lang="ts">\n\t${code}\n</script>\n`;
}

const cases: Record<string, Case[]> = {
  "a rune name that is not a reference": [
    { code: script("let o = { $state: 1 };"), runes: false },
    { code: script("let o = { $state() {} };"), runes: false },
    { code: script("let o = {}; o.$state;"), runes: false },
    { code: script("class A { $state = 1; }"), runes: false },
    { code: script("class A { $state() {} }"), runes: false },
    { code: script("$state: for (;;) break $state;"), runes: false },
    { code: script("$state: for (;;) continue $state;"), runes: false },
    { code: script("import { $state as s } from 'x';"), runes: false },
    { code: script("let a = 1; export { a as $state };"), runes: false },
  ],
  "a declared rune name": [
    { code: script("function f($state) {}"), runes: false },
    { code: "{#each [] as { $state }}{/each}\n", runes: false },
    { code: "<button onclick={($state) => 1}></button>\n", runes: false },
    {
      code: "<button onclick={function ($state) {}}></button>\n",
      runes: false,
    },
    { code: "{#each xs as { ...$state }}{/each}\n", runes: false },
    { code: "{#each [] as [$state]}{/each}\n", runes: false },
    { code: "{#each [] as [...$state]}{/each}\n", runes: false },
    { code: "{#each [] as { a: $state = 1 }}{/each}\n", runes: false },
    { code: "{#each [] as a, $state}{/each}\n", runes: false },
    { code: "{#snippet foo($state)}{/snippet}\n", runes: false },
    { code: "{#snippet $state()}{/snippet}\n", runes: false },
    { code: "{#await p then $state}{/await}\n", runes: false },
    { code: "{#await p catch $state}{/await}\n", runes: false },
    { code: "<Foo let:$state />\n", runes: false },
    { code: "<Foo let:a={$state} />\n", runes: false },
    { code: script("function f($state) { return $state; }"), runes: false },
    { code: "<button onclick={($state) => $state}></button>\n", runes: false },
    { code: "{#each [] as a, $state}{$state}{/each}\n", runes: false },
    { code: "<Foo let:$state>{$state}</Foo>\n", runes: false },
    { code: "{#snippet $state()}{/snippet}{@render $state()}\n", runes: false },
    { code: "{#if true}{@const $state = 1}{/if}\n", runes: false },
    { code: "{#if true}{const $state = 1}{/if}\n", runes: false },
  ],
  "a store subscription": [
    { code: script("let state = 1; let a = $state;"), runes: false },
    {
      code: script(
        "import { writable } from 'svelte/store'; const state = writable(0); let a = $state;",
      ),
      runes: false,
    },
    { code: "<script>\n\tlet state = 1;\n</script>\n{$state}\n", runes: false },
    {
      code: "<script module>\n\tlet state = 1;\n</script>\n<script>\n\tlet a = $state;\n</script>\n",
      runes: false,
    },
    { code: script("let effect = 1; $effect(() => {});"), runes: false },
    {
      code: ts("type state = number; let state = 1; let a = $state;"),
      runes: false,
    },
  ],
  "a rune name in a TypeScript type": [
    { code: ts("let o: $state;"), runes: false },
    { code: ts("let o = 1 as $state;"), runes: false },
    { code: ts("let o = 1 satisfies $state;"), runes: false },
    { code: ts("let o = <$state>1;"), runes: false },
    { code: ts("type T = $state;"), runes: false },
    { code: ts("interface I { a: $state }"), runes: false },
    {
      code: ts("function f<T extends $state>(): $state { return 1 as any; }"),
      runes: false,
    },
    { code: ts("const f = <T,>() => 1; f<$state>();"), runes: false },
    { code: ts("const f = <T,>() => 1; const g = f<$state>;"), runes: false },
    { code: ts("let o: typeof $state.raw;"), runes: false },
    { code: ts("class A implements $state {}"), runes: false },
    { code: ts("abstract class A { abstract m(): $state; }"), runes: false },
    { code: ts("namespace N { export type X = $state; }"), runes: false },
    { code: ts("declare let o: $state;"), runes: false },
    { code: ts("declare let { a = $state(1) }: any;"), runes: false },
    { code: ts("declare function f(a: $state): void;"), runes: false },
    { code: ts("import type { $state } from './x';"), runes: false },
    { code: ts("import { type $state } from './x';"), runes: false },
    { code: ts("type A = 1; export type { A as $state };"), runes: false },
  ],
  "a rune reference": [
    { code: script("let a = $state(0);"), runes: true },
    { code: script("let o = { a: $state.snapshot(1) };"), runes: true },
    { code: script("class A { a = $state(0); }"), runes: true },
    { code: script("let o = {}; let a = o[$state.snapshot(1)];"), runes: true },
    { code: "{#each [] as { a = $state.snapshot(1) }}{/each}\n", runes: true },
    { code: "{#each [] as { a = $state }}{/each}\n", runes: true },
    { code: "{#each [] as { [$state.snapshot(1)]: a }}{/each}\n", runes: true },
    { code: script("function f(a = $state.snapshot(1)) {}"), runes: true },
    {
      code: script("let o = { [$state]: 1 };"),
      runes: true,
      compileError: "rune_missing_parentheses",
    },
    {
      code: script("let o = {}; o[$state];"),
      runes: true,
      compileError: "rune_invalid_computed_property",
    },
    {
      code: script("class A { [$state] = 1; }"),
      runes: true,
      compileError: "rune_missing_parentheses",
    },
    {
      code: script("class A { [$state]() {} }"),
      runes: true,
      compileError: "rune_missing_parentheses",
    },
    {
      code: "<div use:a={$state}></div>\n",
      runes: true,
      compileError: "rune_missing_parentheses",
    },
    { code: script("let state = $state(0); let a = $state(1);"), runes: true },
    {
      code: script("let state = $state.raw(0); let a = $state(1);"),
      runes: true,
    },
    {
      code: script("let inspect = $inspect(1).with(() => {});"),
      runes: true,
    },
    {
      code: script("let props = $props(); let id = $props.id();"),
      runes: true,
    },
    {
      code: script(
        "import { derived } from 'svelte/store'; let d = $derived(1);",
      ),
      runes: true,
    },
    {
      code: script("let o = {}; ({ $state } = o);"),
      runes: true,
      compileError: "rune_missing_parentheses",
    },
  ],
  "a rune reference in TypeScript": [
    { code: ts("let o = $state(1);"), runes: true },
    { code: ts("type T = number; let o = $state(1);"), runes: true },
    { code: ts("let o = $state(1) as number;"), runes: true },
    { code: ts("let o = $state(1) satisfies number;"), runes: true },
    { code: ts("let o = $state(1)!;"), runes: true },
    { code: ts("let o = <number>$state(1);"), runes: true },
    { code: ts("let o = $state<number>(1);"), runes: true },
    { code: ts("let o: number = $state(1);"), runes: true },
    { code: ts("let o = ($state.snapshot<number>)(1);"), runes: true },
    {
      code: ts(
        "class B {} class A extends B { constructor(override x = $state.snapshot(1)) { super(); } }",
      ),
      runes: true,
    },
    { code: ts("export = $state.snapshot(1);"), runes: true },
    {
      code: ts("import type { state } from './x'; let o = $state(1);"),
      runes: true,
    },
    { code: ts("declare let state: number; let o = $state(1);"), runes: true },
    { code: ts("let state = $state!(0);"), runes: true },
    { code: ts("let state = ($state<number>)(0);"), runes: true },
    { code: ts("let state = ($state.raw as any)(0);"), runes: true },
    {
      code: ts("let state = $state(0) as number; let o = $state(1);"),
      runes: true,
    },
  ],
};

describe("Runes mode detection from rune references", () => {
  if (!svelteVersion.gte(5)) {
    return;
  }
  for (const [title, list] of Object.entries(cases)) {
    describe(title, () => {
      for (const { code, runes, compileError } of list) {
        it(code.trim(), () => {
          if (compileError) {
            assert.throws(() => compile(code, {}), { code: compileError });
          } else {
            assert.strictEqual(compile(code, {}).metadata.runes, runes);
          }
          const result = parseForESLint(code, {
            filePath: "test.svelte",
            parser: { ts: tsParser },
          });
          assert.strictEqual(result.services.svelteParseContext.runes, runes);
        });
      }
    });
  }
});
