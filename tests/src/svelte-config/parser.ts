import assert from "assert";
import Module from "module";
import os from "os";
import {
  parseConfig,
  parseViteConfig,
} from "../../../src/svelte-config/parser.js";
import { stripTypes } from "../../../src/svelte-config/index.js";

describe("parseConfig", () => {
  const testCases = [
    {
      code: `export default {compilerOptions:{runes:true}}`,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const opt = {compilerOptions:{runes:true}}
        export default opt
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const compilerOptions = {runes:true}
        export default {compilerOptions}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const kit = {files:{routes:"src/custom"}}
        const compilerOptions = {runes:false}
        export default {compilerOptions,kit}
        `,
      output: {
        compilerOptions: { runes: false },
        kit: { files: { routes: "src/custom" } },
      },
    },
    {
      code: `
        const opt = {compilerOptions:{runes:true}}
        export default {...opt}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const key = "compilerOptions"
        export default {[key]:{runes:false}}
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      code: `
        const {compilerOptions} = {compilerOptions:{runes:true}}
        export default {compilerOptions}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const {compilerOptions = {runes:true}} = {}
        export default {compilerOptions}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        export default {compilerOptions:{}}
        `,
      output: { compilerOptions: {} },
    },
  ];
  for (const { code, output } of testCases) {
    it(code, () => {
      assert.deepStrictEqual(parseConfig(code), output);
    });
  }
});

describe("parseViteConfig", () => {
  const testCases: {
    name: string;
    code: string;
    output: unknown;
  }[] = [
    {
      name: "object literal default export",
      code: `
        import { sveltekit } from "@sveltejs/kit/vite";
        export default {
          plugins: [sveltekit({ compilerOptions: { runes: true }, files: { routes: "src/r" } })],
        };
        `,
      output: {
        compilerOptions: { runes: true },
        files: { routes: "src/r" },
      },
    },
    {
      name: "defineConfig(obj)",
      code: `
        import { defineConfig } from "vite";
        import { sveltekit } from "@sveltejs/kit/vite";
        export default defineConfig({
          plugins: [sveltekit({ compilerOptions: { runes: false } })],
        });
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      name: "defineConfig(() => obj)",
      code: `
        import { defineConfig } from "vite";
        import { sveltekit } from "@sveltejs/kit/vite";
        export default defineConfig(() => ({
          plugins: [sveltekit({ compilerOptions: { runes: true } })],
        }));
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      name: "defineConfig(() => { return obj })",
      code: `
        import { defineConfig } from "vite";
        import { sveltekit } from "@sveltejs/kit/vite";
        export default defineConfig(({ mode }) => {
          const isDev = mode === "development";
          return {
            plugins: [sveltekit({ compilerOptions: { runes: true } })],
          };
        });
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      name: "const identifier default export",
      code: `
        import { defineConfig } from "vite";
        import { sveltekit } from "@sveltejs/kit/vite";
        const config = defineConfig({
          plugins: [sveltekit({ compilerOptions: { runes: true } })],
        });
        export default config;
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      name: "aliased import",
      code: `
        import { sveltekit as kit } from "@sveltejs/kit/vite";
        export default { plugins: [kit({ compilerOptions: { runes: true } })] };
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      name: "namespace import",
      code: `
        import * as kit from "@sveltejs/kit/vite";
        export default { plugins: [kit.sveltekit({ compilerOptions: { runes: true } })] };
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      name: "nested plugins array",
      code: `
        import { sveltekit } from "@sveltejs/kit/vite";
        import other from "other";
        export default {
          plugins: [other(), [[sveltekit({ compilerOptions: { runes: true } })]]],
        };
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      name: "identifier argument",
      code: `
        import { sveltekit } from "@sveltejs/kit/vite";
        export const svelteConfig = {
          compilerOptions: { runes: true },
          files: { lib: "src/l" },
          adapter: adapter(),
        };
        export default { plugins: [sveltekit(svelteConfig)] };
        `,
      output: {
        compilerOptions: { runes: true },
        files: { lib: "src/l" },
      },
    },
    {
      name: "svelte() from @sveltejs/vite-plugin-svelte",
      code: `
        import { svelte } from "@sveltejs/vite-plugin-svelte";
        export default { plugins: [svelte({ compilerOptions: { runes: true } })] };
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      name: "no-arg plugin (SvelteKit 2 style)",
      code: `
        import { sveltekit } from "@sveltejs/kit/vite";
        export default { plugins: [sveltekit()] };
        `,
      output: null,
    },
    {
      name: "svelte() not imported from the Svelte plugin module",
      code: `
        import { svelte } from "some-other-plugin";
        export default { plugins: [svelte({ compilerOptions: { runes: true } })] };
        `,
      output: null,
    },
    {
      name: "locally defined svelte()",
      code: `
        function svelte(o) { return o; }
        export default { plugins: [svelte({ compilerOptions: { runes: true } })] };
        `,
      output: null,
    },
    {
      name: "argument that cannot be evaluated",
      code: `
        import { sveltekit } from "@sveltejs/kit/vite";
        export default { plugins: [sveltekit(getConfig())] };
        `,
      output: null,
    },
    {
      name: "no default export",
      code: `export const a = 1;`,
      output: null,
    },
    {
      name: "unparsable code",
      code: `export default {{{ plugins: [`,
      output: null,
    },
    {
      name: "plugin without options",
      code: `
        import { svelte } from "@sveltejs/vite-plugin-svelte";
        export default { plugins: [svelte({ hot: false })] };
        `,
      output: null,
    },
    {
      name: "runes that cannot be evaluated",
      code: `
        import { svelte } from "@sveltejs/vite-plugin-svelte";
        export default { plugins: [svelte({ compilerOptions: { runes: process.env.RUNES } })] };
        `,
      output: null,
    },
    {
      name: "skips a plugin call without usable options",
      code: `
        import { svelte } from "@sveltejs/vite-plugin-svelte";
        import { sveltekit } from "@sveltejs/kit/vite";
        export default {
          plugins: [svelte(), svelte({ hot: false }), sveltekit({ compilerOptions: { runes: true } })],
        };
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      name: "plugin on the right side of &&",
      code: `
        import { sveltekit } from "@sveltejs/kit/vite";
        export default {
          plugins: [isProd && other(), enabled && sveltekit({ compilerOptions: { runes: true } })],
        };
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      name: "plugin in a conditional expression",
      code: `
        import { sveltekit } from "@sveltejs/kit/vite";
        export default {
          plugins: [isTest ? other() : sveltekit({ compilerOptions: { runes: false } })],
        };
        `,
      output: { compilerOptions: { runes: false } },
    },
  ];
  for (const { name, code, output } of testCases) {
    it(name, () => {
      assert.deepStrictEqual(parseViteConfig(code), output);
    });
  }

  const TS_CODE = `
    import { defineConfig, type UserConfig } from "vite";
    import { sveltekit } from "@sveltejs/kit/vite";
    interface Options { compilerOptions: { runes: boolean } }
    const options: Options = {
      compilerOptions: { runes: true },
    };
    const config: UserConfig = {
      plugins: [sveltekit(options as any)],
    };
    export default defineConfig(config satisfies UserConfig);
    `;

  // `module.stripTypeScriptTypes()` is only available on Node.js 22.13+.
  const itIfNodeStrip =
    typeof (Module as any).stripTypeScriptTypes === "function" ? it : it.skip;
  itIfNodeStrip("TypeScript code with module.stripTypeScriptTypes()", () => {
    const stripped = stripTypes(TS_CODE);
    assert.ok(stripped != null);
    assert.deepStrictEqual(parseViteConfig(stripped), {
      compilerOptions: { runes: true },
    });
  });

  it("TypeScript code with typescript's transpileModule()", () => {
    const stripped = stripTypes(TS_CODE, { useNodeStrip: false });
    assert.ok(stripped != null);
    assert.deepStrictEqual(parseViteConfig(stripped), {
      compilerOptions: { runes: true },
    });
  });

  it("returns null if the typescript package cannot be found", () => {
    const cwd = process.cwd();
    try {
      process.chdir(os.tmpdir());
      assert.strictEqual(
        stripTypes(TS_CODE, { dir: os.tmpdir(), useNodeStrip: false }),
        null,
      );
    } finally {
      process.chdir(cwd);
    }
  });
});
