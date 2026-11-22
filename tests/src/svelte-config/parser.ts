import assert from "assert";
import { parseConfig } from "../../../src/svelte-config/parser.js";

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
    {
      code: `export default {compilerOptions:{experimental:{async:true}}}`,
      output: { compilerOptions: { experimental: { async: true } } },
    },
    {
      code: `export default {compilerOptions:{experimental:{async:false}}}`,
      output: { compilerOptions: { experimental: { async: false } } },
    },
    {
      code: `export default {compilerOptions:{experimental:{async:process.env.X === "1"}}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{experimental:{async:1}}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{experimental:{async:"true"}}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{experimental:{customRenderer:true}}}`,
      output: { compilerOptions: { experimental: { customRenderer: true } } },
    },
    {
      code: `export default {compilerOptions:{experimental:{customRenderer:"my-renderer"}}}`,
      output: {
        compilerOptions: { experimental: { customRenderer: "my-renderer" } },
      },
    },
    {
      code: `export default {compilerOptions:{experimental:{customRenderer:({filename}) => null}}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{experimental:{customRenderer:null}}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{experimental:{customRenderer:false}}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{experimental:{async:true,customRenderer:() => "x"}}}`,
      output: { compilerOptions: { experimental: { async: true } } },
    },
    {
      code: `
        const experimental = {async:true,customRenderer:"my-renderer"}
        export default {compilerOptions:{experimental}}
        `,
      output: {
        compilerOptions: {
          experimental: { async: true, customRenderer: "my-renderer" },
        },
      },
    },
    {
      code: `
        const experimental = {async:true}
        export default {compilerOptions:{experimental:experimental}}
        `,
      output: { compilerOptions: { experimental: { async: true } } },
    },
    {
      code: `
        const base = {async:true}
        export default {compilerOptions:{experimental:{...base}}}
        `,
      output: { compilerOptions: { experimental: { async: true } } },
    },
    {
      code: `export default {compilerOptions:{experimental:true}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{experimental:getExperimental()}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{experimental:{}}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{runes:true},kit:{files:{routes:"src/custom"}}}`,
      output: {
        compilerOptions: { runes: true },
        kit: { files: { routes: "src/custom" } },
      },
    },
  ];
  for (const { code, output } of testCases) {
    it(code, () => {
      assert.deepStrictEqual(parseConfig(code), output);
    });
  }
});
