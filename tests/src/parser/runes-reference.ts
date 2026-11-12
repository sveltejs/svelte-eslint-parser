import assert from "assert";
import { compile } from "svelte/compiler";
import { parseForESLint } from "../../../src/index.js";
import { svelteVersion } from "../../../src/parser/svelte-version.js";
import { generateParserOptions } from "./test-utils.js";

type Case = {
  name: string;
  code: string;
  runes: boolean;
  /** The compiler throws a runes-only error with this code. */
  compileError?: string;
};

/** Wraps the given code in a `<script>` tag. */
function script(code: string): string {
  return `<script>\n\t${code}\n</script>\n`;
}

const cases: Case[] = [
  // Not references.
  { name: "object key", code: script("let o = { $state: 1 };"), runes: false },
  {
    name: "object method",
    code: script("let o = { $state() {} };"),
    runes: false,
  },
  {
    name: "member property",
    code: script("let o = {}; o.$state;"),
    runes: false,
  },
  {
    name: "class field",
    code: script("class A { $state = 1; }"),
    runes: false,
  },
  {
    name: "class method",
    code: script("class A { $state() {} }"),
    runes: false,
  },
  {
    name: "label",
    code: script("$state: for (;;) break $state;"),
    runes: false,
  },
  {
    name: "label with continue",
    code: script("$state: for (;;) continue $state;"),
    runes: false,
  },
  {
    name: "imported name",
    code: script("import { $state as s } from 'x';"),
    runes: false,
  },
  {
    name: "exported name",
    code: script("let a = 1; export { a as $state };"),
    runes: false,
  },
  // Declared names.
  {
    name: "function parameter",
    code: script("function f($state) {}"),
    runes: false,
  },
  {
    name: "each block object pattern",
    code: "{#each [] as { $state }}{/each}\n",
    runes: false,
  },
  {
    name: "arrow function parameter",
    code: "<button onclick={($state) => 1}></button>\n",
    runes: false,
  },
  {
    name: "function expression parameter",
    code: "<button onclick={function ($state) {}}></button>\n",
    runes: false,
  },
  {
    name: "each block object rest",
    code: "{#each xs as { ...$state }}{/each}\n",
    runes: false,
  },
  {
    name: "each block array pattern",
    code: "{#each [] as [$state]}{/each}\n",
    runes: false,
  },
  {
    name: "each block rest element",
    code: "{#each [] as [...$state]}{/each}\n",
    runes: false,
  },
  {
    name: "each block default value target",
    code: "{#each [] as { a: $state = 1 }}{/each}\n",
    runes: false,
  },
  {
    name: "each block index",
    code: "{#each [] as a, $state}{/each}\n",
    runes: false,
  },
  {
    name: "snippet parameter",
    code: "{#snippet foo($state)}{/snippet}\n",
    runes: false,
  },
  {
    name: "snippet name",
    code: "{#snippet $state()}{/snippet}\n",
    runes: false,
  },
  {
    name: "await then value",
    code: "{#await p then $state}{/await}\n",
    runes: false,
  },
  {
    name: "await catch error",
    code: "{#await p catch $state}{/await}\n",
    runes: false,
  },
  { name: "let directive", code: "<Foo let:$state />\n", runes: false },
  {
    name: "let directive with pattern",
    code: "<Foo let:a={$state} />\n",
    runes: false,
  },
  {
    name: "const tag",
    code: "{#if true}{@const $state = 1}{/if}\n",
    runes: false,
  },
  // References.
  { name: "call", code: script("let a = $state(0);"), runes: true },
  {
    name: "object value",
    code: script("let o = { a: $state.snapshot(1) };"),
    runes: true,
  },
  {
    name: "class field value",
    code: script("class A { a = $state(0); }"),
    runes: true,
  },
  {
    name: "member object",
    code: script("let o = {}; let a = o[$state.snapshot(1)];"),
    runes: true,
  },
  {
    name: "default value in a pattern",
    code: "{#each [] as { a = $state.snapshot(1) }}{/each}\n",
    runes: true,
  },
  {
    name: "identifier default value in a pattern",
    code: "{#each [] as { a = $state }}{/each}\n",
    runes: true,
  },
  {
    name: "computed key in a pattern",
    code: "{#each [] as { [$state.snapshot(1)]: a }}{/each}\n",
    runes: true,
  },
  {
    name: "default value of a parameter",
    code: script("function f(a = $state.snapshot(1)) {}"),
    runes: true,
  },
  {
    name: "computed object key",
    code: script("let o = { [$state]: 1 };"),
    runes: true,
    compileError: "rune_missing_parentheses",
  },
  {
    name: "computed member property",
    code: script("let o = {}; o[$state];"),
    runes: true,
    compileError: "rune_invalid_computed_property",
  },
  {
    name: "computed class field",
    code: script("class A { [$state] = 1; }"),
    runes: true,
    compileError: "rune_missing_parentheses",
  },
  {
    name: "computed class method",
    code: script("class A { [$state]() {} }"),
    runes: true,
    compileError: "rune_missing_parentheses",
  },
  {
    name: "class expression name",
    code: script("let C = class $state {};"),
    runes: true,
    compileError: "rune_missing_parentheses",
  },
  {
    name: "action directive",
    code: "<div use:a={$state}></div>\n",
    runes: true,
    compileError: "rune_missing_parentheses",
  },
  {
    name: "assignment pattern",
    code: script("let o = {}; ({ $state } = o);"),
    runes: true,
    compileError: "rune_missing_parentheses",
  },
];

describe("Runes mode detection only counts references", () => {
  if (!svelteVersion.gte(5)) {
    return;
  }
  for (const { name, code, runes, compileError } of cases) {
    it(`${name}: ${code.trim()}`, () => {
      if (compileError) {
        assert.throws(() => compile(code, {}), { code: compileError });
      } else {
        assert.strictEqual(compile(code, {}).metadata.runes, runes);
      }
      const result = parseForESLint(
        code,
        generateParserOptions({ filePath: "test.svelte" }),
      );
      assert.strictEqual(result.services.svelteParseContext.runes, runes);
    });
  }
});
