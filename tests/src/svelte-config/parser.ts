import assert from "assert";
import {
  parseConfig,
  parseViteConfig,
} from "../../../src/svelte-config/parser.js";

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
  const testCases = [
    {
      code: `
        import { sveltekit } from '@sveltejs/kit/vite';
        import { defineConfig } from 'vite';
        export default defineConfig({ plugins: [sveltekit({ compilerOptions: { runes: true } })] });
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      // a bare sveltekit() means the config lives in svelte.config.js
      code: `
        import { sveltekit } from '@sveltejs/kit/vite';
        export default { plugins: [sveltekit()] };
        `,
      output: null,
    },
    {
      // options were passed but cannot be analyzed: svelte.config.js is
      // still ignored by SvelteKit, so an empty config wins over falling back
      code: `
        import { sveltekit } from '@sveltejs/kit/vite';
        import { options } from './config.js';
        export default { plugins: [sveltekit(options)] };
        `,
      output: {},
    },
    {
      code: `
        import { sveltekit } from '@sveltejs/kit/vite';
        const options = { compilerOptions: { runes: false } };
        export default { plugins: [sveltekit(options)] };
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      code: `
        import { sveltekit } from '@sveltejs/kit/vite';
        export default { plugins: [sveltekit({ files: { routes: 'src/custom' } })] };
        `,
      output: { kit: { files: { routes: "src/custom" } } },
    },
    {
      code: `
        import { sveltekit as kit } from '@sveltejs/kit/vite';
        export default { plugins: [kit({ compilerOptions: { runes: true } })] };
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        import { sveltekit } from 'not-kit';
        export default { plugins: [sveltekit({ compilerOptions: { runes: true } })] };
        `,
      output: null,
    },
    {
      code: `
        import { somePlugin } from 'some-plugin';
        export default { plugins: [somePlugin()] };
        `,
      output: null,
    },
    {
      code: `
        import { sveltekit } from '@sveltejs/kit/vite';
        const plugins = [[sveltekit({ compilerOptions: { runes: true } })]];
        export default { plugins };
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        import { sveltekit } from '@sveltejs/kit/vite';
        import { defineConfig, type UserConfig } from 'vite';
        export default defineConfig({ plugins: [sveltekit({ compilerOptions: { runes: true } })] });
        `,
      output: null,
    },
  ];
  for (const { code, output } of testCases) {
    it(code, () => {
      assert.deepStrictEqual(parseViteConfig(code), output);
    });
  }
});
