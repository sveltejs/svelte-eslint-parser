import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import ts from "typescript";
import { normalizeParserOptions } from "../../src/parser/parser-options.js";
import { svelteToVirtualTypeScript } from "../../src/parser/svelte-to-virtual-ts.js";
import {
  _patchTsSysForTesting,
  _resetTranslationCacheForTesting,
  rememberParserOptions,
} from "../../src/ts-sys-hook.js";

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

describe("synthetic component default export", () => {
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

  it("falls back to a permissive props type when none can be recovered", () => {
    const code = translate(`<script lang="ts">
  let value = 1;
</script>
<p>{value}</p>`);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<Record<string, any>>;/,
    );
  });

  it("does not emit a default export when the user already has one", () => {
    const code = translate(`<script lang="ts" context="module">
  export default 42;
</script>`);
    assert.doesNotMatch(code, /import\('svelte'\)\.Component</);
  });

  it("synthesizes props from legacy `export let` declarations", () => {
    const code = translate(`<script lang="ts">
  export let value: string;
  export let count = 0;
</script>
<p>{value}{count}</p>`);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<\{ value: string; count\?: typeof count \}>;/,
    );
  });

  it("marks `export let` props with a default value as optional", () => {
    const code = translate(`<script lang="ts">
  export let value: string = "x";
</script>
<p>{value}</p>`);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<\{ value\?: string \}>;/,
    );
  });

  it("uses a legacy `$$Props` interface, taking priority over `export let`", () => {
    const code = translate(`<script lang="ts">
  interface $$Props { value: string; count?: number }
  export let value: string;
  export let count = 0;
</script>
<p>{value}{count}</p>`);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<\$\$Props>;/,
    );
  });

  it("uses a legacy `$$Props` type alias", () => {
    const code = translate(`<script lang="ts">
  type $$Props = { a: number };
  export let a: number;
</script>
<p>{a}</p>`);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<\$\$Props>;/,
    );
  });

  it("infers prop names and optionality from an un-annotated `$props()`", () => {
    const code = translate(`<script lang="ts">
  let { value, count = 0 } = $props();
</script>
<p>{value}{count}</p>`);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<\{ value: any; count\?: any \}>;/,
    );
  });

  it("falls back when an un-annotated `$props()` has a rest element", () => {
    const code = translate(`<script lang="ts">
  let { value, ...rest } = $props();
</script>
<p>{value}</p>`);
    assert.match(
      code,
      /export default null as unknown as import\('svelte'\)\.Component<Record<string, any>>;/,
    );
  });
});

describe("imported component prop types (end-to-end type check)", () => {
  const require2 = createRequire(import.meta.url);
  const svelteTypesPath = path.join(
    path.dirname(require2.resolve("svelte/package.json")),
    "types/index.d.ts",
  );

  /**
   * Type-checks a consumer `.ts` against the virtual code produced for a
   * `.svelte` component and returns the TypeScript diagnostics. The consumer
   * resolves the component's props through `ComponentProps<typeof Foo>`, exactly
   * like the parser's generated template code does.
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
      return [
        ...program.getSemanticDiagnostics(),
        ...program.getSyntacticDiagnostics(),
      ];
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

  it("accepts a correctly typed prop value from importers", () => {
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

  it("resolves legacy `export let` props to their declared type for importers", () => {
    const legacyComponent = `<script lang="ts">
  export let value: string;
  export let count = 0;
</script>
<p>{value}{count}</p>`;
    const diagnostics = typeCheckConsumer(
      legacyComponent,
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

  it("resolves legacy `$$Props` props to their declared type for importers", () => {
    const legacyComponent = `<script lang="ts">
  interface $$Props { value: string; count?: number }
  export let value: string;
  export let count = 0;
</script>
<p>{value}{count}</p>`;
    const diagnostics = typeCheckConsumer(
      legacyComponent,
      `const value: import("svelte").ComponentProps<typeof Foo>["value"] = 123;`,
    );
    assert.ok(
      diagnostics.some((d) => d.code === 2322),
      `expected TS2322 (number not assignable to string), got: ${diagnostics
        .map((d) => d.code)
        .join(", ")}`,
    );
  });

  it("enforces required props inferred from an un-annotated `$props()`", () => {
    const inferredComponent = `<script lang="ts">
  let { value, count = 0 } = $props();
</script>
<p>{value}{count}</p>`;
    // `value` is required (no default), `count` optional. Omitting `value`
    // must be an error even though the prop types are `any`.
    const diagnostics = typeCheckConsumer(
      inferredComponent,
      `const props: import("svelte").ComponentProps<typeof Foo> = {}; void props;`,
    );
    assert.ok(
      diagnostics.length > 0,
      "expected a missing-required-prop error for the empty props object",
    );
  });
});
