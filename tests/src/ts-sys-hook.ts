import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import ts from "typescript";
import { parseForESLint } from "../../src/index.js";
import { normalizeParserOptions } from "../../src/parser/parser-options.js";
import { svelteToVirtualTypeScript } from "../../src/parser/svelte-to-virtual-ts.js";
import { svelteVersion } from "../../src/parser/svelte-version.js";
import {
  _patchTsSysForTesting,
  _resetTranslationCacheForTesting,
  rememberParserOptions,
} from "../../src/ts-sys-hook.js";

// Runes-specific suites are Svelte 5 only; the legacy suites run on every
// version in the test matrix, with version-aware assertions.
const describeSvelte5 = svelteVersion.gte(5) ? describe : describe.skip;
// In Svelte 5 the exported value is the non-constructable `Component` function
// type, so `new Foo(...)` only applies to the legacy class component.
const describeLegacyClass = svelteVersion.gte(5) ? describe.skip : describe;

const TS_SCRIPT = `<script lang="ts">
  let count: number = 0;
  function inc(): void { count += 1; }
</script>
<button onclick={inc}>{count}</button>
`;

const JS_SCRIPT = `<script>
  let count = 0;
</script>
<button>{count}</button>
`;

function withTempSvelteFile(
  source: string,
  body: (filePath: string) => void,
): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-sys-hook-"));
  const filePath = path.join(dir, "Component.svelte");
  fs.writeFileSync(filePath, source, "utf-8");
  try {
    body(filePath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function makeParserOptions(filePath: string) {
  return normalizeParserOptions({
    filePath,
    parser: "@typescript-eslint/parser",
    ecmaVersion: 2024,
    sourceType: "module",
  });
}

function translate(source: string): string {
  let result: string | null = null;
  withTempSvelteFile(source, (filePath) => {
    result = svelteToVirtualTypeScript(
      filePath,
      source,
      makeParserOptions(filePath),
    );
  });
  assert.notStrictEqual(result, null, "expected non-null translation");
  return result!;
}

function parseComponent(source: string): ReturnType<typeof parseForESLint> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-sys-hook-"));
  const filePath = path.join(dir, "Component.svelte");
  fs.writeFileSync(filePath, source, "utf-8");
  try {
    return parseForESLint(source, makeParserOptions(filePath));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function dumpComments(
  result: ReturnType<typeof parseForESLint>,
): (string | number)[][] {
  return result.ast.comments.map((comment) => [
    comment.type,
    comment.value,
    ...comment.range,
  ]);
}

/**
 * Run `body` with the hook's stderr warnings intercepted rather than printed, so
 * tests that deliberately create a collision don't leak the warning into a
 * normal test run's output. Non-hook writes pass through untouched.
 */
function interceptHookWarnings<T>(body: () => T): {
  result: T;
  warnings: string[];
} {
  const warnings: string[] = [];
  const original = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: unknown, ...rest: unknown[]) => {
    if (typeof chunk === "string" && chunk.includes("ts-sys-hook")) {
      warnings.push(chunk);
      return true;
    }
    return (original as (...a: unknown[]) => boolean)(chunk, ...rest);
  }) as typeof process.stderr.write;
  try {
    return { result: body(), warnings };
  } finally {
    process.stderr.write = original;
  }
}

/** Collect the hook's stderr warnings while `body` runs. */
function captureWarnings(body: () => void): string[] {
  return interceptHookWarnings(body).warnings;
}

/** Run `body`, swallowing hook warnings the test is not asserting on. */
function withoutHookWarnings<T>(body: () => T): T {
  return interceptHookWarnings(body).result;
}

/** Mirrors `componentTypeText` in the parser. */
function expectedComponentTypeText(
  props: string,
  events = "Record<string, any>",
  slots = "Record<string, any>",
): { value: string; type: string } {
  const typeArgs = `<${props}, ${events}, ${slots}>`;
  if (svelteVersion.gte(5)) {
    return {
      value: `import('svelte').Component<${props}>`,
      type: `import('svelte').SvelteComponent${typeArgs}`,
    };
  }
  const cls = svelteVersion.gte(4) ? "SvelteComponent" : "SvelteComponentTyped";
  const inst = `import('svelte').${cls}${typeArgs}`;
  return {
    value: `new (options: import('svelte').ComponentConstructorOptions<${props}>) => ${inst}`,
    type: inst,
  };
}

/** Assert the emitted virtual code carries the expected value/type default export. */
function assertComponentExport(
  code: string,
  props: string,
  events = "Record<string, any>",
  slots = "Record<string, any>",
): void {
  const { value, type } = expectedComponentTypeText(props, events, slots);
  assert.ok(
    code.includes(`: ${value};`),
    `expected value-side type \`${value}\` in:\n${code}`,
  );
  assert.ok(
    code.includes(`= ${type};`),
    `expected type-side \`${type}\` in:\n${code}`,
  );
  assert.match(code, /declare const \$_svelteComponent\d+:/);
  assert.match(code, /export \{ \$_svelteComponent\d+ as default \};/);
}

describe("svelteToVirtualTypeScript", () => {
  it("returns a virtual TypeScript string for a `<script lang='ts'>` block", () => {
    withTempSvelteFile(TS_SCRIPT, (filePath) => {
      const code = svelteToVirtualTypeScript(
        filePath,
        TS_SCRIPT,
        makeParserOptions(filePath),
      );
      assert.notStrictEqual(code, null, "expected non-null translation");
      assert.match(
        code!,
        /let count: number/,
        "expected the user's TS source to appear in the shim",
      );
    });
  });

  it("returns null when the script block isn't TypeScript", () => {
    withTempSvelteFile(JS_SCRIPT, (filePath) => {
      const code = svelteToVirtualTypeScript(
        filePath,
        JS_SCRIPT,
        makeParserOptions(filePath),
      );
      assert.strictEqual(code, null);
    });
  });

  it("returns null when the source cannot be parsed", () => {
    const broken = `<script lang="ts">let x: number =</script>`;
    withTempSvelteFile(broken, (filePath) => {
      const code = svelteToVirtualTypeScript(
        filePath,
        broken,
        makeParserOptions(filePath),
      );
      assert.strictEqual(code, null);
    });
  });
});

describe("rememberParserOptions", () => {
  beforeEach(() => {
    _resetTranslationCacheForTesting();
  });

  it("accepts and discards options without throwing", () => {
    // The hook is a global side-effect; we mostly want to confirm the public
    // priming call is safe to call in any state.
    withTempSvelteFile(TS_SCRIPT, (filePath) => {
      assert.doesNotThrow(() => {
        rememberParserOptions(makeParserOptions(filePath));
      });
    });
  });
});

describe("ts.sys.readFile hook wiring", () => {
  beforeEach(() => {
    _resetTranslationCacheForTesting();
  });

  it("returns the virtual shim for a .svelte path once the sys is patched", () => {
    withTempSvelteFile(TS_SCRIPT, (filePath) => {
      // Track original-readFile calls to prove the hook short-circuits.
      const passthrough: string[] = [];
      const sys = {
        readFile: (p: string) => {
          passthrough.push(p);
          return fs.readFileSync(p, "utf-8");
        },
      };
      _patchTsSysForTesting(sys);
      rememberParserOptions(makeParserOptions(filePath));

      const result = sys.readFile(filePath);
      assert.match(result, /let count: number/, "expected the virtual TS shim");
      assert.deepStrictEqual(
        passthrough,
        [],
        "original readFile must be bypassed for a translatable .svelte path",
      );
    });
  });

  it("falls through to the original readFile for non-.svelte paths", () => {
    withTempSvelteFile(TS_SCRIPT, (filePath) => {
      const tsPath = path.join(path.dirname(filePath), "other.ts");
      fs.writeFileSync(tsPath, "export const x: number = 1;\n", "utf-8");
      const sys = { readFile: (p: string) => fs.readFileSync(p, "utf-8") };
      _patchTsSysForTesting(sys);
      rememberParserOptions(makeParserOptions(filePath));

      assert.strictEqual(sys.readFile(tsPath), "export const x: number = 1;\n");
    });
  });

  it("falls through for a JS-only .svelte file (nothing to translate)", () => {
    withTempSvelteFile(JS_SCRIPT, (filePath) => {
      const sys = { readFile: (p: string) => fs.readFileSync(p, "utf-8") };
      _patchTsSysForTesting(sys);
      rememberParserOptions(makeParserOptions(filePath));

      assert.strictEqual(sys.readFile(filePath), JS_SCRIPT);
    });
  });

  it("does nothing before rememberParserOptions sets options", () => {
    withTempSvelteFile(TS_SCRIPT, (filePath) => {
      const sys = { readFile: (p: string) => fs.readFileSync(p, "utf-8") };
      _patchTsSysForTesting(sys);

      assert.strictEqual(sys.readFile(filePath), TS_SCRIPT);
    });
  });
});

describeSvelte5("synthetic component default export (runes, Svelte 5)", () => {
  it("recovers the props type from an annotated `$props()` declaration", () => {
    const code = translate(`<script lang="ts">
  let { value, count = 0 }: { value: string; count?: number } = $props();
</script>
<p>{value}{count}</p>`);
    assertComponentExport(code, `{ value: string; count?: number }`);
  });

  it("references a named props interface as-is", () => {
    const code = translate(`<script lang="ts">
  interface Props { a: number; b?: string }
  let props: Props = $props();
</script>
<p>{props.a}</p>`);
    assertComponentExport(code, `Props`);
  });

  it("infers an un-annotated `$props()` via a `typeof` probe of the defaults", () => {
    // Required props are `any`; defaulted props get their type from the probe.
    const code = translate(`<script lang="ts">
  let { value, count = 0 } = $props();
</script>
<p>{value}{count}</p>`);
    assert.match(code, /const \$_propsProbe\d+ = \{ count: \(0\) \};/);
    assert.match(
      code,
      /import\('svelte'\)\.Component<Partial<typeof \$_propsProbe\d+> & \{ value: any \}>;/,
    );
  });

  it("keeps a parenthesized default valid in the probe", () => {
    const source = `<script lang="ts">
  let { a = (1, 2) } = $props();
</script>`;
    assert.doesNotThrow(() => parseComponent(source));
    const code = translate(source);
    assert.match(code, /const \$_propsProbe\d+ = \{ a: \(1, 2\) \};/);
    assert.match(
      code,
      /import\('svelte'\)\.Component<Partial<typeof \$_propsProbe\d+>>;/,
    );
  });

  it("degrades defaults with no inhabitable inferred type to optional `any`", () => {
    const code = translate(`<script lang="ts">
  let { items = [], error = null, v = undefined, w = void 0 } = $props();
</script>`);
    assertComponentExport(
      code,
      `{ items?: any[]; error?: any; v?: any; w?: any }`,
    );
  });

  it("still probes defaults that infer a usable type", () => {
    const code = translate(`<script lang="ts">
  let { list = [] as string[], one = [1], o = {} } = $props();
</script>`);
    assert.match(
      code,
      /const \$_propsProbe\d+ = \{ list: \(\[\] as string\[\]\), one: \(\[1\]\), o: \(\{\}\) \};/,
    );
  });

  it("widens an `as const` default so importers can pass other values", () => {
    const code = translate(`<script lang="ts">
  let { xs = [1, 2] as const, mode = "dark" as const } = $props();
</script>`);
    assert.match(
      code,
      /const \$_propsProbe\d+ = \{ xs: \(\[1, 2\]\), mode: \("dark"\) \};/,
    );
  });

  it("degrades an `as const` empty array default like a bare one", () => {
    const code = translate(`<script lang="ts">
  let { xs = [] as const } = $props();
</script>`);
    assertComponentExport(code, `{ xs?: any[] }`);
  });

  it("ignores a `<script module>` `$props()` in favor of the instance one", () => {
    const code = translate(`<script module lang="ts">
  const { moduleThing } = $props();
</script>
<script lang="ts">
  let { realProp }: { realProp: string } = $props();
</script>
<p>{realProp}</p>`);
    assertComponentExport(code, `{ realProp: string }`);
  });

  it("ignores a `$props()` nested inside a function", () => {
    const code = translate(`<script lang="ts">
  function f() { const { inner } = $props(); }
  let { real } = $props();
</script>
<p>{real}</p>`);
    assertComponentExport(code, `{ real: any }`);
  });

  it("references `generics` type parameters in the recovered props type", () => {
    const code = translate(`<script lang="ts" generics="T">
  let { items, selected }: { items: T[]; selected: T } = $props();
</script>
<p>{selected}</p>`);
    assert.match(code, /type T = unknown;/);
    assertComponentExport(code, `{ items: T[]; selected: T }`);
  });

  it("recovers the props type from a `$props() as Props` cast", () => {
    const code = translate(`<script lang="ts">
  interface Props { v: string }
  let p = $props() as Props;
</script>
<p>{p.v}</p>`);
    assertComponentExport(code, `Props`);
  });

  it("recovers the props type from a `$props() satisfies Props` expression", () => {
    const code = translate(`<script lang="ts">
  interface Props { v: string }
  let p = $props() satisfies Props;
</script>
<p>{p.v}</p>`);
    assertComponentExport(code, `Props`);
  });

  it("recovers the outermost type from stacked `as` casts", () => {
    const code = translate(`<script lang="ts">
  interface Inner { v: string }
  interface Outer { v: string }
  let p = $props() as Inner as Outer;
</script>
<p>{p.v}</p>`);
    assertComponentExport(code, `Outer`);
  });

  it("recovers the outermost type from a `satisfies` followed by an `as`", () => {
    const code = translate(`<script lang="ts">
  interface Inner { v: string }
  interface Outer { v: string }
  let p = $props() satisfies Inner as Outer;
</script>
<p>{p.v}</p>`);
    assertComponentExport(code, `Outer`);
  });

  it("looks through a non-null assertion to the declared annotation", () => {
    const code = translate(`<script lang="ts">
  interface Props { v: string }
  let p: Props = $props()!;
</script>
<p>{p.v}</p>`);
    assertComponentExport(code, `Props`);
  });

  it("looks through a non-null assertion to a following `as` cast", () => {
    const code = translate(`<script lang="ts">
  interface Props { v: string }
  let p = $props()! as Props;
</script>
<p>{p.v}</p>`);
    assertComponentExport(code, `Props`);
  });

  it("is not swallowed by a trailing line comment with no following newline", () => {
    const code = translate(
      `<script lang="ts">let { v }: { v: string } = $props() // trailing</script>`,
    );
    assert.match(code, /\ndeclare const \$_svelteComponent\d+:/);
    assertComponentExport(code, `{ v: string }`);
  });

  it("keeps enumerated props and opens the type for a rest element", () => {
    const code = translate(`<script lang="ts">
  let { value, ...rest } = $props();
</script>
<p>{value}</p>`);
    assertComponentExport(code, `{ value: any } & Record<string, any>`);
  });

  it("opens the type for a computed key without discarding the other props", () => {
    const code = translate(`<script lang="ts">
  const k = "a";
  let { count = 0, [k]: v } = $props();
</script>
<p>{count}{v}</p>`);
    const probe = /const (\$_propsProbe\d+) = /u.exec(code)?.[1];
    assert.ok(probe, `expected a props probe in:\n${code}`);
    assertComponentExport(
      code,
      `Partial<typeof ${probe}> & Record<string, any>`,
    );
  });

  it("resolves a computed key that is a string literal", () => {
    const code = translate(`<script lang="ts">
  let { ["a"]: a, b } = $props();
</script>
<p>{a}{b}</p>`);
    assertComponentExport(code, `{ "a": any; b: any }`);
  });

  it("resolves a computed key that is a numeric literal", () => {
    const code = translate(`<script lang="ts">
  let { [0]: zero } = $props();
</script>
<p>{zero}</p>`);
    assertComponentExport(code, `{ 0: any }`);
  });

  it("keeps a numeric-literal key without opening the whole prop set", () => {
    const code = translate(`<script lang="ts">
  let { 0: zero, name } = $props();
</script>
<p>{zero}{name}</p>`);
    assertComponentExport(code, `{ 0: any; name: any }`);
  });

  it("opens the type for a bigint key, which no type literal can name", () => {
    const code = translate(`<script lang="ts">
  let { 0n: big, name } = $props();
</script>
<p>{big}{name}</p>`);
    assertComponentExport(code, `{ name: any } & Record<string, any>`);
  });

  it("accepts no props at all for an empty destructuring", () => {
    const code = translate(`<script lang="ts">
  let {} = $props();
</script>
<p>hi</p>`);
    assertComponentExport(code, `Record<string, never>`);
  });

  it("falls back to a permissive props type when there is no recoverable `$props()`", () => {
    const code = translate(`<script lang="ts">
  let count = $state(0);
</script>
<p>{count}</p>`);
    assertComponentExport(code, `Record<string, any>`);
  });

  it("exposes the default export as both a value and a type", () => {
    // The export must carry both meanings: `ComponentProps<typeof Foo>` needs
    // the value, `ComponentEvents<Foo>` needs the type.
    const code = translate(`<script lang="ts">
  let { value }: { value: string } = $props();
</script>
<p>{value}</p>`);
    assert.match(code, /declare const \$_svelteComponent\d+:/);
    assert.match(code, /type \$_svelteComponent\d+ = /);
    assert.match(code, /export \{ \$_svelteComponent\d+ as default \};/);
  });

  it("types the exported value as the Svelte 5 `Component` (for `typeof Foo`)", () => {
    const code = translate(`<script lang="ts">
  let { value }: { value: string } = $props();
</script>
<p>{value}</p>`);
    assert.match(
      code,
      /declare const \$_svelteComponent\d+: import\('svelte'\)\.Component<\{ value: string \}>;/,
    );
    assert.match(
      code,
      /type \$_svelteComponent\d+ = import\('svelte'\)\.SvelteComponent</,
    );
  });

  it("does not emit a default export when the user already has one", () => {
    const code = translate(`<script lang="ts" module>
  export default 42;
</script>
<script lang="ts">
  let { value }: { value: string } = $props();
</script>
<p>{value}</p>`);
    assert.doesNotMatch(code, /export \{ \$_svelteComponent\d+ as default \};/);
    assert.match(code, /export default 42/);
  });

  it("does not emit a default export when the user has `export { x as default }`", () => {
    const code = translate(`<script lang="ts" module>
  const x = 42;
  export { x as default };
</script>
<script lang="ts">
  let { value }: { value: string } = $props();
</script>
<p>{value}</p>`);
    assert.doesNotMatch(code, /export \{ \$_svelteComponent\d+ as default \};/);
  });
});

describe("synthetic component default export (legacy, all versions)", () => {
  it("synthesizes props from legacy `export let` declarations", () => {
    const code = translate(`<script lang="ts">
  export let value: string;
  export let count = 0;
</script>
<p>{value}{count}</p>`);
    assertComponentExport(code, `{ value: string; count?: typeof count }`);
  });

  it("marks `export let` props with a default value as optional", () => {
    const code = translate(`<script lang="ts">
  export let value: string = "x";
</script>
<p>{value}</p>`);
    assertComponentExport(code, `{ value?: string }`);
  });

  it("uses a legacy `$$Props` interface, taking priority over `export let`", () => {
    const code = translate(`<script lang="ts">
  interface $$Props { value: string; count?: number }
  export let value: string;
  export let count = 0;
</script>
<p>{value}{count}</p>`);
    assertComponentExport(code, `$$Props`);
  });

  it("uses a legacy `$$Props` type alias", () => {
    const code = translate(`<script lang="ts">
  type $$Props = { a: number };
  export let a: number;
</script>
<p>{a}</p>`);
    assertComponentExport(code, `$$Props`);
  });

  it("wires legacy `$$Events` and `$$Slots` into the component type", () => {
    const code = translate(`<script lang="ts">
  interface $$Props { value: string }
  interface $$Events { foo: CustomEvent<number> }
  interface $$Slots { default: {} }
  export let value: string;
</script>
<p>{value}</p>`);
    assertComponentExport(code, `$$Props`, `$$Events`, `$$Slots`);
  });

  it("falls back to a permissive props type when none can be recovered", () => {
    const code = translate(`<script lang="ts">
  let value = 1;
</script>
<p>{value}</p>`);
    assertComponentExport(code, `Record<string, any>`);
  });

  // Renamed exports of a top-level `let` are props too.
  it("treats `export { className as class }` as a `class` prop", () => {
    const code = translate(`<script lang="ts">
  let className: string = "";
  export { className as class };
</script>
<div class={className}></div>`);
    assertComponentExport(code, `{ class?: string }`);
  });

  it("treats a renamed `export { foo as bar }` of a top-level `let` as a prop", () => {
    const code = translate(`<script lang="ts">
  let foo: number;
  export { foo as bar };
</script>
<p>{foo}</p>`);
    // The local's annotation is used as-is, mirroring the `export let` path.
    assertComponentExport(code, `{ bar: number }`);
  });

  it("infers a renamed export's type via `typeof` when the local is un-annotated", () => {
    const code = translate(`<script lang="ts">
  let foo = 0;
  export { foo as bar };
</script>
<p>{foo}</p>`);
    assertComponentExport(code, `{ bar?: typeof foo }`);
  });

  it("ignores a renamed export whose local is not a top-level `let`", () => {
    const code = translate(`<script lang="ts">
  function helper() {}
  export { helper as onClick };
  export let value: string;
</script>
<p>{value}</p>`);
    assertComponentExport(code, `{ value: string }`);
  });

  // Instance/module boundary: `result.ast.body` concatenates both scripts, so a
  // module-context declaration must not leak into the instance component type.
  it("does not treat a module-script `export let` as a prop", () => {
    const code = translate(`<script lang="ts" context="module">
  export let shared = 1;
</script>
<script lang="ts">
  export let value: string;
</script>
<p>{value}</p>`);
    assertComponentExport(code, `{ value: string }`);
  });

  it("ignores a `$$Props` declared in the module script", () => {
    const code = translate(`<script lang="ts" context="module">
  interface $$Props { fromModule: number }
</script>
<script lang="ts">
  export let value: string;
</script>
<p>{value}</p>`);
    // The module `$$Props` is ignored, so the instance `export let` synthesis wins.
    assertComponentExport(code, `{ value: string }`);
  });

  it("ignores `$$Events`/`$$Slots` declared in the module script", () => {
    const code = translate(`<script lang="ts" context="module">
  interface $$Events { foo: CustomEvent<number> }
  interface $$Slots { default: {} }
</script>
<script lang="ts">
  export let value: string;
</script>
<p>{value}</p>`);
    // Module-declared `$$Events`/`$$Slots` are not honored; events/slots stay permissive.
    assertComponentExport(code, `{ value: string }`);
  });

  // `type` is not a script-context attribute, so `<script type="module">` is an
  // instance script. Only `context="module"` (and Svelte 5's `module`) make one.
  it('treats a lone `<script type="module">` as the instance script', () => {
    const code = translate(`<script type="module" lang="ts">
  export let value: string;
</script>
<p>{value}</p>`);
    assertComponentExport(code, `{ value: string }`);
  });

  it('does not leak a module-script `export let` into a `<script type="module">` instance', () => {
    const code = translate(`<script context="module" lang="ts">
  export let shared = 1;
</script>
<script type="module" lang="ts">
  export let value: string;
</script>
<p>{value}</p>`);
    assertComponentExport(code, `{ value: string }`);
  });

  it('ignores a module-script `$$Props` when the instance is `<script type="module">`', () => {
    const code = translate(`<script context="module" lang="ts">
  interface $$Props { fromModule: number }
</script>
<script type="module" lang="ts">
  export let value: string;
</script>
<p>{value}</p>`);
    assertComponentExport(code, `{ value: string }`);
  });

  // Open props: a component reading `$$props`/`$$restProps` accepts arbitrary
  // attributes, so the synthesized (closed) props type is opened.
  it("opens the synthesized props type when `$$restProps` is referenced", () => {
    const code = translate(`<script lang="ts">
  export let value: string;
  $$restProps;
</script>
<p>{value}</p>`);
    assertComponentExport(code, `{ value: string } & { [key: string]: any }`);
  });

  it("opens the synthesized props type when `$$props` is referenced", () => {
    const code = translate(`<script lang="ts">
  export let value: string;
  const all = $$props;
</script>
<p>{value}{all}</p>`);
    assertComponentExport(code, `{ value: string } & { [key: string]: any }`);
  });

  it("keeps an authored `$$Props` type authoritative even with `$$restProps`", () => {
    const code = translate(`<script lang="ts">
  interface $$Props { value: string }
  export let value: string;
  $$restProps;
</script>
<p>{value}</p>`);
    // `$$Props` is used as-is (the user owns the open/closed decision there).
    assertComponentExport(code, `$$Props`);
  });

  // Version-agnostic guards, exercised with legacy `export let` components.
  it("is not swallowed by a trailing line comment with no following newline", () => {
    const code = translate(
      `<script lang="ts">export let v: string // trailing</script>`,
    );
    assert.match(code, /\ndeclare const \$_svelteComponent\d+:/);
    assertComponentExport(code, `{ v: string }`);
  });

  it("does not emit a default export when the user already has one", () => {
    const code = translate(`<script lang="ts" context="module">
  export default 42;
</script>
<script lang="ts">
  export let value: string;
</script>
<p>{value}</p>`);
    assert.doesNotMatch(code, /export \{ \$_svelteComponent\d+ as default \};/);
    assert.match(code, /export default 42/);
  });

  it("does not emit a default export when the user has `export { x as default }`", () => {
    const code = translate(`<script lang="ts" context="module">
  const x = 42;
  export { x as default };
</script>
<script lang="ts">
  export let value: string;
</script>
<p>{value}</p>`);
    assert.doesNotMatch(code, /export \{ \$_svelteComponent\d+ as default \};/);
  });
});

// The `<script module>` shorthand is Svelte 5 only; the `context="module"`
// equivalents live in the all-versions suite above.
describeSvelte5("instance/module boundary with `<script module>`", () => {
  it('does not leak a `<script module>` `export let` into a `<script type="module">` instance', () => {
    const code = translate(`<script module lang="ts">
  export let shared = 1;
</script>
<script type="module" lang="ts">
  export let value: string;
</script>
<p>{value}</p>`);
    assertComponentExport(code, `{ value: string }`);
  });
});

// The end-to-end suites type-check a consumer `.ts` against the virtual code
// produced for a `.svelte` component: the importer experience.
const require2 = createRequire(import.meta.url);
const sveltePackageJson = require2("svelte/package.json");
// Svelte 3 ships its runtime types at `types/runtime/index.d.ts`, Svelte 4/5 at
// `types/index.d.ts`; read the location from the package's `types` field.
const svelteTypesPath = path.join(
  path.dirname(require2.resolve("svelte/package.json")),
  sveltePackageJson.types ??
    sveltePackageJson.exports?.["."]?.types ??
    "types/index.d.ts",
);
// Fail loudly if that path rots, instead of silently type-checking the e2e
// consumers against a missing `svelte` module.
assert.ok(
  fs.existsSync(svelteTypesPath),
  `resolved svelte types path does not exist: ${svelteTypesPath}`,
);

// Diagnostic codes meaning the synthetic export itself is structurally broken:
// a missing module, an unresolved name, or a non-existent Svelte helper type.
// These must never appear on the producer file, or importers silently
// type-check against `any`.
const PRODUCER_STRUCTURAL_CODES = new Set([2304, 2307, 2503, 2551, 2552, 2694]);

/**
 * Type-check a consumer `.ts` against the virtual code produced for a `.svelte`
 * component. Only the consumer's diagnostics are returned, since the producer
 * has pre-existing ones of its own, but the producer is still asserted free of
 * `PRODUCER_STRUCTURAL_CODES` so its rot can't pass behind a clean consumer.
 */
function typeCheckConsumer(
  componentSource: string,
  consumerBody: string,
): ts.Diagnostic[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "component-export-"));
  try {
    const componentVirtual = svelteToVirtualTypeScript(
      path.join(dir, "Foo.svelte"),
      componentSource,
      makeParserOptions(path.join(dir, "Foo.svelte")),
    );
    assert.notStrictEqual(componentVirtual, null);
    fs.writeFileSync(path.join(dir, "Foo.ts"), componentVirtual!, "utf-8");
    fs.writeFileSync(
      path.join(dir, "Bar.ts"),
      `import Foo from "./Foo";\n${consumerBody}\n`,
      "utf-8",
    );

    const program = ts.createProgram(
      [path.join(dir, "Foo.ts"), path.join(dir, "Bar.ts")],
      {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        types: [],
        baseUrl: dir,
        paths: { svelte: [svelteTypesPath] },
      },
    );
    const barPath = path.join(dir, "Bar.ts");
    const fooPath = path.join(dir, "Foo.ts");
    const all = [
      ...program.getSemanticDiagnostics(),
      ...program.getSyntacticDiagnostics(),
    ];
    const producerStructural = all.filter(
      (d) =>
        d.file?.fileName === fooPath && PRODUCER_STRUCTURAL_CODES.has(d.code),
    );
    assert.deepStrictEqual(
      producerStructural.map((d) => d.code),
      [],
      `producer Foo.ts has structural diagnostics: ${producerStructural
        .map(
          (d) =>
            `TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`,
        )
        .join("; ")}`,
    );
    return all.filter((d) => d.file?.fileName === barPath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describeSvelte5(
  "imported component prop types, runes (end-to-end type check)",
  () => {
    const COMPONENT = `<script lang="ts">
  let { value, count = 0 }: { value: string; count?: number } = $props();
</script>
<p>{value}{count}</p>`;

    it("resolves a prop to its declared type for importers", () => {
      const diagnostics = typeCheckConsumer(
        COMPONENT,
        `const value: import("svelte").ComponentProps<typeof Foo>["value"] = 123;`,
      );
      // `value` is `string`, so assigning a number must be a type error.
      assert.ok(
        diagnostics.some((d) => d.code === 2322),
        `expected TS2322 (number not assignable to string), got: ${diagnostics
          .map((d) => d.code)
          .join(", ")}`,
      );
    });

    it("accepts correctly typed prop values from importers", () => {
      const diagnostics = typeCheckConsumer(
        COMPONENT,
        `const value: import("svelte").ComponentProps<typeof Foo>["value"] = "hello";\nconst count: import("svelte").ComponentProps<typeof Foo>["count"] = 5;\nvoid value; void count;`,
      );
      assert.deepStrictEqual(
        diagnostics.map((d) => d.code),
        [],
        `expected no diagnostics, got: ${diagnostics
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
          .join("; ")}`,
      );
    });

    // The `typeof` probe lets TS infer arbitrary default types, not just literals.
    // Each case checks the importer-side resolved type via a good + bad assignment.
    const INFERRED_DEFAULTS: {
      name: string;
      prop: string;
      decl: string;
      good: string;
      bad: string;
    }[] = [
      {
        name: "number literal",
        prop: "n",
        decl: "n = 0",
        good: "1",
        bad: '"x"',
      },
      {
        name: "negative number",
        prop: "n",
        decl: "n = -1",
        good: "-2",
        bad: '"x"',
      },
      { name: "string", prop: "s", decl: 's = "x"', good: '"y"', bad: "1" },
      { name: "boolean", prop: "b", decl: "b = false", good: "true", bad: "1" },
      {
        name: "array",
        prop: "a",
        decl: "a = [1, 2]",
        good: "[3]",
        bad: '["x"]',
      },
      {
        name: "object",
        prop: "o",
        decl: "o = { x: 1 }",
        good: "{ x: 2 }",
        bad: '{ x: "s" }',
      },
      {
        name: "$bindable(literal)",
        prop: "v",
        decl: "v = $bindable(0)",
        good: "5",
        bad: '"x"',
      },
      {
        name: "string-literal key",
        prop: "data-id",
        decl: '"data-id": id = 1',
        good: "2",
        bad: '"x"',
      },
    ];
    for (const c of INFERRED_DEFAULTS) {
      it(`infers and enforces an un-annotated default (${c.name})`, () => {
        const component = `<script lang="ts">\n  let { ${c.decl} } = $props();\n</script>`;
        const t = `import("svelte").ComponentProps<typeof Foo>[${JSON.stringify(c.prop)}]`;
        const good = typeCheckConsumer(
          component,
          `const ok: ${t} = ${c.good};`,
        );
        assert.deepStrictEqual(
          good.map((d) => d.code),
          [],
          `expected ${c.good} to be accepted, got: ${good
            .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
            .join("; ")}`,
        );
        const bad = typeCheckConsumer(component, `const ng: ${t} = ${c.bad};`);
        assert.ok(
          bad.some((d) => d.code === 2322),
          `expected ${c.bad} to be rejected (TS2322), got: ${bad
            .map((d) => d.code)
            .join(", ")}`,
        );
      });
    }

    it("still resolves defaults alongside a rest element", () => {
      const component = `<script lang="ts">\n  let { count = 0, ...rest } = $props();\n</script>`;
      const t = `import("svelte").ComponentProps<typeof Foo>["count"]`;
      const good = typeCheckConsumer(component, `const ok: ${t} = 5;`);
      assert.deepStrictEqual(
        good.map((d) => d.code),
        [],
        `expected 5 to be accepted, got: ${good
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
          .join("; ")}`,
      );
      const bad = typeCheckConsumer(component, `const ng: ${t} = "x";`);
      assert.ok(
        bad.some((d) => d.code === 2322),
        `expected "x" to be rejected (TS2322), got: ${bad
          .map((d) => d.code)
          .join(", ")}`,
      );
    });

    it("accepts arbitrary extra props when a rest element is present", () => {
      // Annotating the object is what exercises the open type: `mount()` infers
      // its props from the argument, so it never rejects an extra property.
      const diagnostics = typeCheckConsumer(
        `<script lang="ts">\n  let { count = 0, ...rest } = $props();\n</script>`,
        `const p: import("svelte").ComponentProps<typeof Foo> = { count: 1, anything: "ok" };\nvoid p;`,
      );
      assert.deepStrictEqual(
        diagnostics.map((d) => d.code),
        [],
        `expected no diagnostics, got: ${diagnostics
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
          .join("; ")}`,
      );
    });

    // A default whose inferred type is uninhabitable (`never[]`, `null`,
    // `undefined`) would reject every value an importer can pass.
    const DEGENERATE_DEFAULTS: { name: string; decl: string; value: string }[] =
      [
        { name: "empty array", decl: "items = []", value: '["a"]' },
        { name: "null", decl: "items = null", value: "new Error()" },
        { name: "undefined", decl: "items = undefined", value: "1" },
      ];
    for (const c of DEGENERATE_DEFAULTS) {
      it(`lets importers pass any value for a degraded default (${c.name})`, () => {
        const diagnostics = typeCheckConsumer(
          `<script lang="ts">\n  let { ${c.decl} } = $props();\n</script>`,
          `const ok: import("svelte").ComponentProps<typeof Foo>["items"] = ${c.value};\nvoid ok;`,
        );
        assert.deepStrictEqual(
          diagnostics.map((d) => d.code),
          [],
          `expected ${c.value} to be accepted, got: ${diagnostics
            .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
            .join("; ")}`,
        );
      });
    }

    // `as const` would freeze the default into a narrow literal type, so an
    // importer passing any other value of the same shape would be rejected.
    const AS_CONST_DEFAULTS: { name: string; decl: string; value: string }[] = [
      { name: "tuple", decl: "xs = [1, 2] as const", value: "[3, 4]" },
      { name: "string", decl: 'mode = "dark" as const', value: '"light"' },
    ];
    for (const c of AS_CONST_DEFAULTS) {
      it(`lets importers pass another value for an \`as const\` default (${c.name})`, () => {
        const prop = c.decl.slice(0, c.decl.indexOf(" "));
        const diagnostics = typeCheckConsumer(
          `<script lang="ts">\n  let { ${c.decl} } = $props();\n</script>`,
          `const ok: import("svelte").ComponentProps<typeof Foo>["${prop}"] = ${c.value};\nvoid ok;`,
        );
        assert.deepStrictEqual(
          diagnostics.map((d) => d.code),
          [],
          `expected ${c.value} to be accepted, got: ${diagnostics
            .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
            .join("; ")}`,
        );
      });
    }

    it("does not let a `<script module>` `$props()` hijack the instance props", () => {
      const diagnostics = typeCheckConsumer(
        `<script module lang="ts">\n  const { moduleThing } = $props();\n</script>\n<script lang="ts">\n  let { realProp }: { realProp: string } = $props();\n</script>`,
        `import { mount } from "svelte";\nmount(Foo, { target: null as any, props: { realProp: "hi" } });`,
      );
      assert.deepStrictEqual(
        diagnostics.map((d) => d.code),
        [],
        `expected no diagnostics, got: ${diagnostics
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
          .join("; ")}`,
      );
    });

    it("works with Svelte 5 `mount(Foo, ...)` value usage and checks props", () => {
      const diagnostics = typeCheckConsumer(
        COMPONENT,
        `import { mount } from "svelte";\nmount(Foo, { target: null as any, props: { value: "x" } });`,
      );
      assert.deepStrictEqual(
        diagnostics.map((d) => d.code),
        [],
        `expected no diagnostics for mount(Foo, ...), got: ${diagnostics
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
          .join("; ")}`,
      );
    });

    it("rejects wrong prop types via Svelte 5 `mount(Foo, ...)`", () => {
      const diagnostics = typeCheckConsumer(
        COMPONENT,
        `import { mount } from "svelte";\nmount(Foo, { target: null as any, props: { value: 123 } });`,
      );
      assert.ok(
        diagnostics.some((d) => d.code === 2322 || d.code === 2769),
        `expected a prop type error from mount(Foo, ...), got: ${diagnostics
          .map((d) => d.code)
          .join(", ")}`,
      );
    });

    it("resolves generic component props (type params as their constraint) for importers", () => {
      const genericComponent = `<script lang="ts" generics="T extends string">
  let { v }: { v: T } = $props();
</script>
<p>{v}</p>`;
      const diagnostics = typeCheckConsumer(
        genericComponent,
        `const v: import("svelte").ComponentProps<typeof Foo>["v"] = 123;`,
      );
      assert.ok(
        diagnostics.some((d) => d.code === 2322),
        `expected TS2322 (number not assignable to string), got: ${diagnostics
          .map((d) => d.code)
          .join(", ")}`,
      );
    });
  },
);

describe("imported component prop types, legacy (end-to-end type check)", () => {
  const LEGACY_COMPONENT = `<script lang="ts">
  export let value: string;
  export let count = 0;
</script>
<p>{value}{count}</p>`;

  it("resolves legacy `export let` props to their declared type for importers", () => {
    // Svelte-4-style `ComponentProps<Foo>` uses `Foo` as a *type* (the instance),
    // which the type-side alias provides on every version.
    const diagnostics = typeCheckConsumer(
      LEGACY_COMPONENT,
      `const value: import("svelte").ComponentProps<Foo>["value"] = 123;`,
    );
    // `value` is `string`, so assigning a number must be a type error.
    assert.ok(
      diagnostics.some((d) => d.code === 2322),
      `expected TS2322 (number not assignable to string), got: ${diagnostics
        .map((d) => d.code)
        .join(", ")}`,
    );
  });

  it("resolves legacy `$$Props` props to their declared type for importers", () => {
    const legacyComponent = `<script lang="ts">
  interface $$Props { value: string; count?: number }
  export let value: string;
  export let count = 0;
</script>
<p>{value}{count}</p>`;
    const diagnostics = typeCheckConsumer(
      legacyComponent,
      `const value: import("svelte").ComponentProps<Foo>["value"] = 123;`,
    );
    assert.ok(
      diagnostics.some((d) => d.code === 2322),
      `expected TS2322 (number not assignable to string), got: ${diagnostics
        .map((d) => d.code)
        .join(", ")}`,
    );
  });

  it("resolves legacy `$$Events` event types for importers", () => {
    const legacyComponent = `<script lang="ts">
  interface $$Events { foo: CustomEvent<number> }
  export let value: string;
</script>
<p>{value}</p>`;
    // `ComponentEvents<Foo>` uses `Foo` as a type. It must resolve (no TS2749)
    // and carry the declared event detail type.
    const diagnostics = typeCheckConsumer(
      legacyComponent,
      `type E = import("svelte").ComponentEvents<Foo>;\nconst bad: E["foo"] = null as unknown as CustomEvent<string>;\nvoid bad;`,
    );
    assert.ok(
      !diagnostics.some((d) => d.code === 2749),
      "expected `Foo` to be usable as a type (no TS2749)",
    );
    assert.ok(
      diagnostics.some((d) => d.code === 2322),
      `expected TS2322 for the wrong event detail type, got: ${diagnostics
        .map((d) => d.code)
        .join(", ")}`,
    );
  });

  it("keeps `Foo` usable as a type even without `$$Events` (no regression)", () => {
    const legacyComponent = `<script lang="ts">
  export let value: string;
</script>
<p>{value}</p>`;
    // Without `$$Events`, events stay permissive (`any`), but `ComponentEvents<Foo>`
    // must still resolve rather than failing with "Foo refers to a value".
    const diagnostics = typeCheckConsumer(
      legacyComponent,
      `type E = import("svelte").ComponentEvents<Foo>;\nconst e: E["anything"] = 1;\nvoid e;`,
    );
    assert.deepStrictEqual(
      diagnostics.map((d) => d.code),
      [],
      `expected no diagnostics (events permissive, Foo usable as a type), got: ${diagnostics
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
        .join("; ")}`,
    );
  });

  it("resolves a renamed reserved-word prop (`export { className as class }`) for importers", () => {
    const legacyComponent = `<script lang="ts">
  let className: string;
  export { className as class };
</script>
<div class={className}></div>`;
    // `class` resolves to `string`, so assigning a number must be a type error.
    const diagnostics = typeCheckConsumer(
      legacyComponent,
      `const c: import("svelte").ComponentProps<Foo>["class"] = 123;`,
    );
    assert.ok(
      diagnostics.some((d) => d.code === 2322),
      `expected TS2322 (number not assignable to string) for the \`class\` prop, got: ${diagnostics
        .map((d) => d.code)
        .join(", ")}`,
    );
  });

  it("accepts arbitrary extra attributes when the component reads `$$restProps`", () => {
    const legacyComponent = `<script lang="ts">
  export let value: string;
  $$restProps;
</script>
<p>{value}</p>`;
    // The open props type must accept extra attributes without a TS2353
    // excess-property error, while still typing the declared prop.
    const diagnostics = typeCheckConsumer(
      legacyComponent,
      `const props: import("svelte").ComponentProps<Foo> = { value: "x", extra: 1 };\nvoid props;`,
    );
    assert.deepStrictEqual(
      diagnostics.map((d) => d.code),
      [],
      `expected the extra attribute to be accepted, got: ${diagnostics
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
        .join("; ")}`,
    );
  });

  it("still rejects a wrong-typed declared prop when props are open (`$$restProps`)", () => {
    const legacyComponent = `<script lang="ts">
  export let value: string;
  $$restProps;
</script>
<p>{value}</p>`;
    // Opening the props with an index signature must not weaken the declared prop.
    const diagnostics = typeCheckConsumer(
      legacyComponent,
      `const v: import("svelte").ComponentProps<Foo>["value"] = 123;`,
    );
    assert.ok(
      diagnostics.some((d) => d.code === 2322),
      `expected TS2322 for the wrong \`value\` type, got: ${diagnostics
        .map((d) => d.code)
        .join(", ")}`,
    );
  });
});

describeLegacyClass(
  "imported component value usage, legacy class (end-to-end type check)",
  () => {
    it("allows `new Foo(...)` on the legacy class component value", () => {
      const legacyComponent = `<script lang="ts">
  export let value: string;
</script>
<p>{value}</p>`;
      const diagnostics = typeCheckConsumer(
        legacyComponent,
        `const instance = new Foo({ target: null as any, props: { value: "x" } });\nvoid instance;`,
      );
      assert.deepStrictEqual(
        diagnostics.map((d) => d.code),
        [],
        `expected no diagnostics for new Foo(...), got: ${diagnostics
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
          .join("; ")}`,
      );
    });

    it("rejects a wrong prop value passed to `new Foo({ props: … })`", () => {
      const legacyComponent = `<script lang="ts">
  export let value: string;
</script>
<p>{value}</p>`;
      // `ComponentConstructorOptions<Props>` validates `props`, so a number where
      // `value: string` is expected must error.
      const diagnostics = typeCheckConsumer(
        legacyComponent,
        `const instance = new Foo({ target: null as any, props: { value: 123 } });\nvoid instance;`,
      );
      assert.ok(
        diagnostics.some((d) => d.code === 2322 || d.code === 2769),
        `expected a prop type error from new Foo({ props: … }), got: ${diagnostics
          .map((d) => d.code)
          .join(", ")}`,
      );
    });
  },
);

// The suites above write the virtual code to `Foo.ts` and import `"./Foo"`,
// which bypasses real module resolution. The suites below exercise the actual
// importer path: a real `import Foo from "./Foo.svelte"` resolved through the
// ts.sys hook's `X.svelte.ts` companion. The program includes Svelte's real
// ambient `declare module '*.svelte'`, so these tests also prove the companion
// wins over that permissive fallback.

/**
 * Type-check a consumer `.ts` that does a real `import Foo from "./Foo.svelte"`,
 * routing the compiler host's `fileExists`/`readFile`/`getSourceFile` through a
 * freshly-patched sys object (the same patch `installTsSysHook` applies to
 * `ts.sys`). Returns the consumer's diagnostics.
 *
 * - `patch: false` skips the hook, so `./Foo.svelte` resolves to Svelte's
 *   ambient module instead: the negative control for the ambient-shadow test.
 * - `realCompanion` writes a real `Foo.svelte.ts` to disk to exercise the
 *   conflict guard.
 */
function realResolutionDiagnostics(
  componentSource: string,
  consumerBody: string,
  {
    patch = true,
    realCompanion,
  }: { patch?: boolean; realCompanion?: string } = {},
): ts.Diagnostic[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "real-resolve-"));
  try {
    const sveltePath = path.join(dir, "Foo.svelte");
    fs.writeFileSync(sveltePath, componentSource, "utf-8");
    if (realCompanion !== undefined) {
      fs.writeFileSync(path.join(dir, "Foo.svelte.ts"), realCompanion, "utf-8");
    }
    const barPath = path.join(dir, "Bar.ts");
    fs.writeFileSync(
      barPath,
      `import Foo from "./Foo.svelte";\n${consumerBody}\n`,
      "utf-8",
    );

    // Base behavior is plain disk access; the hook adds interception on top.
    const sys = {
      readFile: (p: string): string | undefined => {
        try {
          return fs.readFileSync(p, "utf-8");
        } catch {
          return undefined;
        }
      },
      fileExists: (p: string): boolean => fs.existsSync(p),
    };
    if (patch) {
      _resetTranslationCacheForTesting();
      _patchTsSysForTesting(sys);
      rememberParserOptions(makeParserOptions(sveltePath));
    }

    const compilerOptions: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: [],
      baseUrl: dir,
      paths: { svelte: [svelteTypesPath] },
    };
    const host = ts.createCompilerHost(compilerOptions);
    host.fileExists = (p) => sys.fileExists(p);
    host.readFile = (p) => sys.readFile(p);
    host.getSourceFile = (fileName, languageVersionOrOptions) => {
      const text = sys.readFile(fileName);
      return text === undefined
        ? undefined
        : ts.createSourceFile(fileName, text, languageVersionOrOptions);
    };

    const program = ts.createProgram([barPath], compilerOptions, host);
    const all = [
      ...program.getSemanticDiagnostics(),
      ...program.getSyntacticDiagnostics(),
    ];
    return all.filter((d) => d.file?.fileName === barPath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("ts.sys `X.svelte.ts` companion (unit)", () => {
  beforeEach(() => {
    _resetTranslationCacheForTesting();
  });

  it("claims existence of and serves the companion for a translatable `.svelte`", () => {
    withTempSvelteFile(TS_SCRIPT, (sveltePath) => {
      const companion = `${sveltePath}.ts`;
      const sys = {
        readFile: (p: string) => fs.readFileSync(p, "utf-8"),
        fileExists: (p: string) => fs.existsSync(p),
      };
      _patchTsSysForTesting(sys);
      rememberParserOptions(makeParserOptions(sveltePath));

      assert.strictEqual(
        sys.fileExists(companion),
        true,
        "companion must appear to exist so resolution reaches readFile",
      );
      assert.match(
        sys.readFile(companion),
        /declare const \$_svelteComponent\d+:/,
        "companion read must return the component's virtual code",
      );
    });
  });

  it("does not claim a companion when there is no `.svelte` source", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-sys-hook-"));
    try {
      const companion = path.join(dir, "Missing.svelte.ts");
      const sys = {
        readFile: (p: string): string | undefined => {
          try {
            return fs.readFileSync(p, "utf-8");
          } catch {
            return undefined;
          }
        },
        fileExists: (p: string) => fs.existsSync(p),
      };
      _patchTsSysForTesting(sys);
      rememberParserOptions(
        makeParserOptions(path.join(dir, "Missing.svelte")),
      );

      assert.strictEqual(sys.fileExists(companion), false);
      assert.strictEqual(sys.readFile(companion), undefined);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("stays a complete passthrough when a real `X.svelte.ts` exists (conflict guard)", () => {
    withTempSvelteFile(TS_SCRIPT, (sveltePath) => {
      const companion = `${sveltePath}.ts`;
      const realContent = "export const runesModuleMarker = 1;\n";
      fs.writeFileSync(companion, realContent, "utf-8");
      const sys = {
        readFile: (p: string) => fs.readFileSync(p, "utf-8"),
        fileExists: (p: string) => fs.existsSync(p),
      };
      _patchTsSysForTesting(sys);
      rememberParserOptions(makeParserOptions(sveltePath));

      // The collision is deliberate here, so the warning is expected.
      withoutHookWarnings(() => {
        // The real runes module must win, untouched, not the virtual code.
        assert.strictEqual(sys.fileExists(companion), true);
        assert.strictEqual(sys.readFile(companion), realContent);

        // Once the real file is gone, the virtual companion takes over.
        fs.rmSync(companion);
        assert.strictEqual(sys.fileExists(companion), true);
        assert.match(
          sys.readFile(companion),
          /declare const \$_svelteComponent\d+:/,
        );
      });
    });
  });
});

describe("ts.sys companion name collision warning", () => {
  beforeEach(() => {
    // Also re-arms the once-per-process warning flag.
    _resetTranslationCacheForTesting();
  });

  it("warns exactly once when a real `X.svelte.ts` shadows `X.svelte`", () => {
    withTempSvelteFile(TS_SCRIPT, (sveltePath) => {
      const companion = `${sveltePath}.ts`;
      fs.writeFileSync(companion, "export const x = 1;\n", "utf-8");
      // A second colliding pair, to prove the flag is per-process not per-file.
      const otherSvelte = path.join(path.dirname(sveltePath), "Other.svelte");
      fs.writeFileSync(otherSvelte, TS_SCRIPT, "utf-8");
      fs.writeFileSync(`${otherSvelte}.ts`, "export const y = 1;\n", "utf-8");

      const sys = {
        readFile: (p: string) => fs.readFileSync(p, "utf-8"),
        fileExists: (p: string) => fs.existsSync(p),
      };
      _patchTsSysForTesting(sys);
      rememberParserOptions(makeParserOptions(sveltePath));

      const warnings = captureWarnings(() => {
        // Several probes of both colliding pairs, through both patched methods.
        sys.fileExists(companion);
        sys.readFile(companion);
        sys.fileExists(companion);
        sys.fileExists(`${otherSvelte}.ts`);
        sys.readFile(`${otherSvelte}.ts`);
      });

      assert.strictEqual(
        warnings.length,
        1,
        `expected exactly one warning, got: ${JSON.stringify(warnings)}`,
      );
      assert.ok(
        warnings[0].includes(companion) && warnings[0].includes(sveltePath),
        `expected the colliding paths in the warning, got: ${warnings[0]}`,
      );
      assert.ok(
        warnings[0].includes("svelte/no-conflicting-module-names"),
        `expected the lint rule name in the warning, got: ${warnings[0]}`,
      );

      // The guard itself is unchanged: the real module is served untouched.
      assert.strictEqual(sys.fileExists(companion), true);
      assert.strictEqual(sys.readFile(companion), "export const x = 1;\n");
    });
  });

  it("does not warn for a `.svelte.ts` module with no `.svelte` sibling", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-sys-hook-"));
    try {
      const lone = path.join(dir, "store.svelte.ts");
      fs.writeFileSync(lone, "export const count = 1;\n", "utf-8");
      const sys = {
        readFile: (p: string) => fs.readFileSync(p, "utf-8"),
        fileExists: (p: string) => fs.existsSync(p),
      };
      _patchTsSysForTesting(sys);
      rememberParserOptions(makeParserOptions(path.join(dir, "Any.svelte")));

      const warnings = captureWarnings(() => {
        sys.fileExists(lone);
        sys.readFile(lone);
      });

      assert.deepStrictEqual(
        warnings,
        [],
        `expected no warning without a .svelte sibling, got: ${JSON.stringify(warnings)}`,
      );
      assert.strictEqual(sys.readFile(lone), "export const count = 1;\n");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describeSvelte5(
  "imported component prop types via real `.svelte` resolution (runes, e2e)",
  () => {
    const RUNES_COMPONENT = `<script lang="ts">
  let { value, count = 0 }: { value: string; count?: number } = $props();
</script>
<p>{value}{count}</p>`;

    const PROBE_COMPONENT = `<script lang="ts">
  let { value, count = 0 } = $props();
</script>
<p>{value}{count}</p>`;

    it("rejects a wrong-typed prop through a real `import Foo from './Foo.svelte'`", () => {
      const diagnostics = realResolutionDiagnostics(
        RUNES_COMPONENT,
        `const value: import("svelte").ComponentProps<typeof Foo>["value"] = 123; void value;`,
      );
      assert.ok(
        diagnostics.some((d) => d.code === 2322),
        `expected TS2322 through real resolution, got: ${diagnostics
          .map((d) => d.code)
          .join(", ")}`,
      );
    });

    it("accepts a correctly-typed prop through real resolution", () => {
      const diagnostics = realResolutionDiagnostics(
        RUNES_COMPONENT,
        `const value: import("svelte").ComponentProps<typeof Foo>["value"] = "ok"; void value;`,
      );
      assert.deepStrictEqual(
        diagnostics.map((d) => d.code),
        [],
        `expected no diagnostics, got: ${diagnostics
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
          .join("; ")}`,
      );
    });

    // The `typeof`-probe inference relies on a `const` value declaration, which
    // only survives when the companion is served as an implementation file, not
    // a declaration file.
    it("preserves un-annotated `$props()` probe inference through real resolution", () => {
      const bad = realResolutionDiagnostics(
        PROBE_COMPONENT,
        `const count: import("svelte").ComponentProps<typeof Foo>["count"] = "x"; void count;`,
      );
      assert.ok(
        bad.some((d) => d.code === 2322),
        `expected the probe-inferred number prop to reject a string, got: ${bad
          .map((d) => d.code)
          .join(", ")}`,
      );
      const good = realResolutionDiagnostics(
        PROBE_COMPONENT,
        `const count: import("svelte").ComponentProps<typeof Foo>["count"] = 1; void count;`,
      );
      assert.deepStrictEqual(
        good.map((d) => d.code),
        [],
        `expected the probe-inferred number prop to accept a number, got: ${good
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
          .join("; ")}`,
      );
    });

    it("resolves the companion, not Svelte's ambient `declare module '*.svelte'`", () => {
      // Negative control: without the hook, `./Foo.svelte` resolves to Svelte's
      // ambient module, whose props are permissive, so the import still resolves
      // (no TS2307) but a wrong-typed prop is not caught (no TS2322).
      const ambient = realResolutionDiagnostics(
        RUNES_COMPONENT,
        `const value: import("svelte").ComponentProps<typeof Foo>["value"] = 123; void value;`,
        { patch: false },
      );
      assert.ok(
        !ambient.some((d) => d.code === 2307),
        "the ambient `declare module '*.svelte'` should resolve the import",
      );
      assert.ok(
        !ambient.some((d) => d.code === 2322),
        "the ambient module's props are permissive, so no type error is expected",
      );
      // With the hook, the companion's `value: string` rejects a number, an
      // error the ambient's permissive props could never produce.
      const hooked = realResolutionDiagnostics(
        RUNES_COMPONENT,
        `const value: import("svelte").ComponentProps<typeof Foo>["value"] = 123; void value;`,
      );
      assert.ok(
        hooked.some((d) => d.code === 2322),
        `expected the companion prop type to win over the ambient, got: ${hooked
          .map((d) => d.code)
          .join(", ")}`,
      );
    });
  },
);

describe("imported component prop types via real `.svelte` resolution (legacy, e2e)", () => {
  const LEGACY_COMPONENT = `<script lang="ts">
  export let value: string;
  export let count = 0;
</script>
<p>{value}{count}</p>`;

  it("resolves legacy `export let` props through a real `.svelte` import", () => {
    // Svelte-4-style `ComponentProps<Foo>` uses `Foo` as a type, provided on
    // every version by the companion's type-side alias.
    const diagnostics = realResolutionDiagnostics(
      LEGACY_COMPONENT,
      `const value: import("svelte").ComponentProps<Foo>["value"] = 123; void value;`,
    );
    assert.ok(
      diagnostics.some((d) => d.code === 2322),
      `expected TS2322 through real resolution, got: ${diagnostics
        .map((d) => d.code)
        .join(", ")}`,
    );
  });

  it("resolves legacy `$$Events` event types through a real `.svelte` import", () => {
    const eventsComponent = `<script lang="ts">
  interface $$Events { foo: CustomEvent<number> }
  export let value: string;
</script>
<p>{value}</p>`;
    // `ComponentEvents<Foo>` uses `Foo` as a type, provided by the companion's
    // type-side alias, so it must resolve (no TS2749 "Foo refers to a value").
    const diagnostics = realResolutionDiagnostics(
      eventsComponent,
      `type E = import("svelte").ComponentEvents<Foo>;\nconst bad: E["foo"] = null as unknown as CustomEvent<string>;\nvoid bad;`,
    );
    assert.ok(
      !diagnostics.some((d) => d.code === 2749),
      "expected `Foo` to be usable as a type through real resolution (no TS2749)",
    );
    assert.ok(
      diagnostics.some((d) => d.code === 2322),
      `expected TS2322 for the wrong event detail type, got: ${diagnostics
        .map((d) => d.code)
        .join(", ")}`,
    );
  });

  it("resolves to a user-authored default export instead of the synthetic one", () => {
    const userDefault = `<script lang="ts" context="module">
  export default 42;
</script>
<script lang="ts">
  export let value: string;
</script>
<p>{value}</p>`;
    // `Foo` is the user's `export default 42` (a number), so assigning it to a
    // string must error, proving resolution reached the user's own default.
    const diagnostics = realResolutionDiagnostics(
      userDefault,
      `const s: string = Foo; void s;`,
    );
    assert.ok(
      diagnostics.some((d) => d.code === 2322),
      `expected TS2322 (number default not assignable to string), got: ${diagnostics
        .map((d) => d.code)
        .join(", ")}`,
    );
  });

  it("stays a passthrough to a real `X.svelte.ts` next to `X.svelte` (conflict guard)", () => {
    // A genuine runes module `Foo.svelte.ts` on disk must win: `Foo.real` (its
    // own export) resolves, while the synthetic virtual export never shadows it.
    const realCompanion = `const _c: { real: string } = { real: "" };\nexport default _c;\n`;
    // The collision is deliberate here, so the warning is expected.
    const ok = withoutHookWarnings(() =>
      realResolutionDiagnostics(
        LEGACY_COMPONENT,
        `const r: string = Foo.real; void r;`,
        { realCompanion },
      ),
    );
    assert.deepStrictEqual(
      ok.map((d) => d.code),
      [],
      `expected the real .svelte.ts to be used untouched, got: ${ok
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
        .join("; ")}`,
    );
    const bad = withoutHookWarnings(() =>
      realResolutionDiagnostics(
        LEGACY_COMPONENT,
        `const n: number = Foo.real; void n;`,
        { realCompanion },
      ),
    );
    assert.ok(
      bad.some((d) => d.code === 2322),
      `expected TS2322 from the real module's \`real: string\`, got: ${bad
        .map((d) => d.code)
        .join(", ")}`,
    );
  });
});

// The synthetic default export copies user source into the virtual code (a
// `$props()` default, and the props type text twice), so comments inside those
// copies must not survive restore as phantom entries.
describeSvelte5(
  "linted comments are unaffected by the synthetic export",
  () => {
    // A module-context default export suppresses the synthetic one without moving
    // anything in the instance script.
    const SUPPRESS = `\n<script module lang="ts">\n  export default 0;\n</script>`;
    const CASES: { name: string; source: string }[] = [
      {
        name: "a line comment in a default",
        source: `<script lang="ts">\n  let { a = [\n    // note\n    1,\n  ] } = $props();\n</script>`,
      },
      {
        name: "a block comment in a default",
        source: `<script lang="ts">\n  let { a = [/* note */ 1] } = $props();\n</script>`,
      },
      {
        name: "a comment in a `$props()` type annotation",
        source: `<script lang="ts">\n  let { a }: { /* note */ a: string } = $props();\n</script>`,
      },
    ];
    for (const c of CASES) {
      it(`keeps \`ast.comments\` identical for ${c.name}`, () => {
        const withExport = parseComponent(c.source);
        const withoutExport = parseComponent(c.source + SUPPRESS);
        assert.deepStrictEqual(
          dumpComments(withExport),
          dumpComments(withoutExport),
        );
        assert.strictEqual(withExport.ast.comments.length, 1);
      });
    }
  },
);

// The probe const is virtual-only, and a default referencing a local makes it
// read that local. Restore must drop both the probe's own variable and the read
// it appended, neither of which shows up in the AST body.
describeSvelte5("the props probe leaves no trace in the scope manager", () => {
  const SOURCE = `<script lang="ts">\n  const base = { a: 1 };\n  let { conf = base } = $props();\n</script>`;

  it("declares no `$_propsProbe` variable in any scope", () => {
    const { scopeManager } = parseComponent(SOURCE);
    const leaked = scopeManager.scopes
      .flatMap((scope) => scope.variables)
      .map((variable) => variable.name)
      .filter((name) => /^\$_propsProbe\d+$/u.test(name));
    assert.deepStrictEqual(leaked, []);
  });

  it("appends no dangling reference to the user variable the default reads", () => {
    const { scopeManager } = parseComponent(SOURCE);
    const base = scopeManager.scopes
      .flatMap((scope) => scope.variables)
      .find((variable) => variable.name === "base");
    assert.ok(base, "expected a `base` variable");
    for (const reference of base.references) {
      const [start, end] = reference.identifier.range!;
      assert.strictEqual(
        SOURCE.slice(start, end),
        "base",
        `reference at ${start}-${end} does not span the real \`base\` identifier`,
      );
    }
  });
});
