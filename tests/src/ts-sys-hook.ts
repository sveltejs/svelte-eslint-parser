import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
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
