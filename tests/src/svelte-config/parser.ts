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
    {
      code: `export default {compilerOptions:{runes:true, ...{}}}`,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const shared = {css:"injected"}
        export default {compilerOptions:{runes:true, ...shared}}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `export default {compilerOptions:{runes:true, ...{a:1}}}`,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `export default {compilerOptions:{runes:true, ...{...{}}}}`,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `export default {compilerOptions:{runes:true, ...null}}`,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `export default {compilerOptions:{runes:true, ...undefined}}`,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const {runes = false} = {runes:true, ...{}}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const s = {alias:{}}
        export default {kit:{files:{routes:"src/pages"}, ...s}}
        `,
      output: { kit: { files: { routes: "src/pages" } } },
    },
    {
      code: `export default {kit:{files:{routes:"src/pages"}, ...{}}}`,
      output: { kit: { files: { routes: "src/pages" } } },
    },
    {
      code: `
        import importedShared from "./x.js"
        export default {compilerOptions:{runes:true, ...importedShared}}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `export default {compilerOptions:{runes:true, ...f()}}`,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `export default {compilerOptions:{runes:true, ...{runes:undefined}}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{runes:false, ...{runes:true}}}`,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `export default {compilerOptions:{...{}, runes:true}}`,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `export default {compilerOptions:{runes:true}, ...{}}`,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const {runes = true} = {...null}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const {runes = true} = {...undefined}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const {runes = true} = {...f()}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: {} },
    },
    {
      code: `
        const {runes = true} = {[f()]: 1}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: {} },
    },
    {
      code: `
        const {runes = true} = {...{}}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const {runes = true} = {...{...f()}}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{runes:true, ...{...f()}}}`,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const a = {...a}
        export default {compilerOptions:{...a, ...{}}}
        `,
      output: { compilerOptions: {} },
    },
    {
      code: `
        const s = {x: {kit: {files:{lib:"a"}}, ...{kit:{files:{lib:"b"}}}}}
        const {x: o} = s
        const {x: {kit}} = s
        export default {[o]: 1, kit}
        `,
      output: { kit: { files: { lib: "b" } } },
    },
    {
      code: `
        const shared = {x: {files: {lib:"a"}, ...{files: {lib:"b"}}}}
        const {x: r} = shared
        const {x: k} = shared
        export default {compilerOptions: {runes: r}, kit: k}
        `,
      output: {
        compilerOptions: { runes: true },
        kit: { files: { lib: "b" } },
      },
    },
    {
      code: `
        const shared = {x: {files: {lib:"a"}, files: {lib:"b"}}}
        const {x: r} = shared
        const {x: k} = shared
        export default {compilerOptions: {runes: r}, kit: k}
        `,
      output: {
        compilerOptions: { runes: true },
        kit: { files: { lib: "b" } },
      },
    },
    {
      code: [
        "const a0 = {}",
        ...Array.from(
          { length: 25 },
          (_, i) => `const a${i + 1} = {...a${i}, ...a${i}}`,
        ),
        "export default {compilerOptions:{runes:true, ...a25}}",
      ].join("\n"),
      output: { compilerOptions: { runes: true } },
    },
  ];
  for (const { code, output } of testCases) {
    it(code, () => {
      assert.deepStrictEqual(parseConfig(code), output);
    });
  }
});
