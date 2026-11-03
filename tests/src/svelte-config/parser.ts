import assert from "assert";
import {
  parseConfig,
  parseViteConfig,
} from "../../../src/svelte-config/parser.js";
import { stripTypeScriptTypes } from "../../../src/svelte-config/index.js";

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
  ];
  for (const { name, code, output } of testCases) {
    it(name, () => {
      assert.deepStrictEqual(parseViteConfig(code), output);
    });
  }

  // `module.stripTypeScriptTypes()` is only available on Node.js 22.13+.
  const itIfStripTypes =
    stripTypeScriptTypes("const a: number = 1") == null ? it.skip : it;
  itIfStripTypes("TypeScript code with type annotations", () => {
    const code = `
      import { defineConfig, type UserConfig } from "vite";
      import { sveltekit } from "@sveltejs/kit/vite";
      const options: { compilerOptions: { runes: boolean } } = {
        compilerOptions: { runes: true },
      };
      const config: UserConfig = {
        plugins: [sveltekit(options as any)],
      };
      export default defineConfig(config satisfies UserConfig);
      `;
    const stripped = stripTypeScriptTypes(code);
    assert.ok(stripped != null);
    assert.deepStrictEqual(parseViteConfig(stripped), {
      compilerOptions: { runes: true },
    });
  });
});
