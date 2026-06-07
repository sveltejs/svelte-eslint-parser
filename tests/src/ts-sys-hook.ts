import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import ts from "typescript";
import { normalizeParserOptions } from "../../src/parser/parser-options.js";
import { svelteToVirtualTypeScript } from "../../src/parser/svelte-to-virtual-ts.js";
import { svelteVersion } from "../../src/parser/svelte-version.js";
import {
  _patchTsSysForTesting,
  _resetTranslationCacheForTesting,
  rememberParserOptions,
} from "../../src/ts-sys-hook.js";

// The synthetic component export is scoped to Svelte 5 (runes); skip these
// suites when running the test matrix against Svelte 3/4.
const describeSvelte5 = svelteVersion.gte(5) ? describe : describe.skip;

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

describeSvelte5("synthetic component default export (Svelte 5)", () => {
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

  it("recovers the props type from an annotated `$props()` declaration", () => {
    const code = translate(`<script lang="ts">
  let { value, count = 0 }: { value: string; count?: number } = $props();
</script>
<p>{value}{count}</p>`);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<\{ value: string; count\?: number \}>;/,
    );
  });

  it("references a named props interface as-is", () => {
    const code = translate(`<script lang="ts">
  interface Props { a: number; b?: string }
  let props: Props = $props();
</script>
<p>{props.a}</p>`);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<Props>;/,
    );
  });

  it("infers an un-annotated `$props()` via a `typeof` probe of the defaults", () => {
    // Required props are `any`; defaulted props are optional, their types left to
    // TS inference over the probe (asserted end-to-end below).
    const code = translate(`<script lang="ts">
  let { value, count = 0 } = $props();
</script>
<p>{value}{count}</p>`);
    assert.match(code, /const \$_propsProbe\d+ = \{ count: 0 \};/);
    assert.match(
      code,
      /import\('svelte'\)\.Component<Partial<typeof \$_propsProbe\d+> & \{ value: any \}>;/,
    );
  });

  it("references `generics` type parameters in the recovered props type", () => {
    const code = translate(`<script lang="ts" generics="T">
  let { items, selected }: { items: T[]; selected: T } = $props();
</script>
<p>{selected}</p>`);
    assert.match(code, /type T = unknown;/);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<\{ items: T\[\]; selected: T \}>;/,
    );
  });

  it("recovers the props type from a `$props() as Props` cast", () => {
    const code = translate(`<script lang="ts">
  interface Props { v: string }
  let p = $props() as Props;
</script>
<p>{p.v}</p>`);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<Props>;/,
    );
  });

  it("recovers the props type from a `$props() satisfies Props` expression", () => {
    const code = translate(`<script lang="ts">
  interface Props { v: string }
  let p = $props() satisfies Props;
</script>
<p>{p.v}</p>`);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<Props>;/,
    );
  });

  it("is not swallowed by a trailing line comment with no following newline", () => {
    const code = translate(
      `<script lang="ts">let { v }: { v: string } = $props() // trailing</script>`,
    );
    assert.match(
      code,
      /\nexport default null as unknown as import\('svelte'\)\.Component<\{ v: string \}>;/,
    );
  });

  it("does not emit for an un-annotated `$props()` with a rest element", () => {
    const code = translate(`<script lang="ts">
  let { value, ...rest } = $props();
</script>
<p>{value}</p>`);
    assert.doesNotMatch(code, /import\('svelte'\)\.Component</);
  });

  it("does not emit for legacy `export let` components (Svelte 5 scope only)", () => {
    const code = translate(`<script lang="ts">
  export let value: string;
</script>
<p>{value}</p>`);
    assert.doesNotMatch(code, /import\('svelte'\)\.Component</);
  });

  it("does not emit when there is no recoverable `$props()`", () => {
    const code = translate(`<script lang="ts">
  let count = $state(0);
</script>
<p>{count}</p>`);
    assert.doesNotMatch(code, /import\('svelte'\)\.Component</);
  });

  it("does not emit a default export when the user already has one", () => {
    const code = translate(`<script lang="ts" module>
  export default 42;
</script>
<script lang="ts">
  let { value }: { value: string } = $props();
</script>
<p>{value}</p>`);
    assert.doesNotMatch(code, /import\('svelte'\)\.Component</);
    assert.match(code, /export default 42/);
  });
});

describeSvelte5("imported component prop types (end-to-end type check)", () => {
  const require2 = createRequire(import.meta.url);
  const svelteTypesPath = path.join(
    path.dirname(require2.resolve("svelte/package.json")),
    "types/index.d.ts",
  );

  /**
   * Type-checks a consumer `.ts` against the virtual code produced for a
   * `.svelte` component, returning only the consumer's diagnostics (the importer
   * experience). Diagnostics internal to the producer virtual file — e.g. the
   * pre-existing `unknown` of an un-annotated `$props()` — are excluded.
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
      return [
        ...program.getSemanticDiagnostics(),
        ...program.getSyntacticDiagnostics(),
      ].filter((d) => d.file?.fileName === barPath);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

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
    { name: "number literal", prop: "n", decl: "n = 0", good: "1", bad: '"x"' },
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
      const good = typeCheckConsumer(component, `const ok: ${t} = ${c.good};`);
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
});
