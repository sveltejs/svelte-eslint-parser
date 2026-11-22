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
          { length: 40 },
          (_, i) => `const a${i + 1} = {...a${i}, ...a${i}}`,
        ),
        "export default {compilerOptions:{runes:true, ...a40}}",
      ].join("\n"),
      output: { compilerOptions: { runes: true } },
    },
    {
      code: [
        `const a0 = {routes:"src/pages"}`,
        ...Array.from(
          { length: 40 },
          (_, i) => `const a${i + 1} = {...a${i}, ...a${i}}`,
        ),
        "export default {kit:{files:a40}}",
      ].join("\n"),
      output: { kit: { files: { routes: "src/pages" } } },
    },
    {
      code: `export default {compilerOptions:{runes:false, ...{runes:f()}}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{runes:true, ...{runes:f(), ...{}}}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {compilerOptions:{runes:false, ...{get runes() { return true }}}}`,
      output: { compilerOptions: {} },
    },
    {
      code: `export default {kit:{files:{routes:"a", routes:"b"}}}`,
      output: { kit: { files: { routes: "b" } } },
    },
    {
      code: `
        const a = {...a}
        export default {compilerOptions:{...a}}
        `,
      output: { compilerOptions: {} },
    },
    {
      code: `
        const a = {...a}
        export default {kit:{files:a}}
        `,
      output: { kit: {} },
    },
    {
      code: `
        const a = {a}
        export default {kit:{files:a, ...{}}}
        `,
      output: { kit: {} },
    },
    {
      code: `
        const {css, runes} = {css:"injected", runes:false}
        export default {compilerOptions:{css, runes}}
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      code: `
        const {a, kit} = {a:1, kit:{files:{routes:"src/pages"}}}
        export default {kit}
        `,
      output: { kit: { files: { routes: "src/pages" } } },
    },
    {
      code: `
        const {a, b: {runes}} = {a:1, b:{runes:false}}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      code: `
        const {a: {x}, b: {runes}} = {a:{x:1}, b:{runes:false}}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      code: `
        const {a = 1, runes = false} = {}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      code: `
        const k = "a"
        const {[k]: x, runes} = {a:1, runes:true}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const k = "runes"
        const {[k]: runes} = {runes:false}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      code: `
        const {"": runes} = {"": false}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      code: `
        const {kit, ...rest} = {kit:{files:{lib:"a"}}, compilerOptions:{runes:false}}
        export default {kit:{files:{routes:"b"}}, ...rest}
        `,
      output: {
        compilerOptions: { runes: false },
        kit: { files: { routes: "b" } },
      },
    },
    {
      code: `
        const {compilerOptions, ...rest} = {compilerOptions:{runes:true}, kit:{}}
        export default {compilerOptions:{runes:false}, ...rest}
        `,
      output: { compilerOptions: { runes: false }, kit: {} },
    },
    {
      code: `
        const {a, ...files} = {a:1, routes:"src/pages"}
        export default {kit:{files}}
        `,
      output: { kit: { files: { routes: "src/pages" } } },
    },
    {
      code: `
        const {routes, ...r1} = {routes:"a", lib:"b", assets:"c"}
        const {lib, ...files} = r1
        export default {kit:{files}}
        `,
      output: { kit: { files: { assets: "c" } } },
    },
    {
      code: `
        const {a: {routes, ...files}} = {a:{routes:"a", lib:"b"}}
        export default {kit:{files}}
        `,
      output: { kit: { files: { lib: "b" } } },
    },
    {
      code: `
        const k = "x"
        const {[k]: x, ...files} = {x:1, routes:"a"}
        export default {kit:{files}}
        `,
      output: { kit: { files: { routes: "a" } } },
    },
    {
      code: `
        const {runes, ...rest} = {runes:true}
        export default {compilerOptions:{runes:false, ...rest}}
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      code: `
        const {a, ...rest} = {a:1, runes:true}
        export default {compilerOptions:{runes:false, ...rest}}
        `,
      output: { compilerOptions: { runes: true } },
    },
    {
      code: `
        const {a: [x, ...y], runes} = {a: [], runes: false}
        export default {compilerOptions:{runes}}
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      code: `
        const {runes, ...rest} = {runes: true}
        const {runes: r = false} = rest
        export default {compilerOptions:{runes: r}}
        `,
      output: { compilerOptions: { runes: false } },
    },
    {
      code: `
        const k = "x"
        const {[k]: a, ...rest} = {compilerOptions: false}
        export default {compilerOptions:{runes:true}, ...rest}
        `,
      output: {},
    },
    {
      code: `
        const {[f()]: x, ...files} = {x:1, routes:"a"}
        export default {kit:{files}}
        `,
      output: { kit: {} },
    },
    {
      code: `
        const a = b
        const b = a
        export default {compilerOptions:{runes:a}}
        `,
      output: { compilerOptions: {} },
    },
    {
      code: `
        const {[k]: x, ...files} = {routes:"a"}
        const k = x
        export default {kit:{files}}
        `,
      output: { kit: {} },
    },
    {
      code: `
        const cfg = {kit:{files:{lib:"x"}}}
        const {[{["__proto__"]: null}]: a, kit} = cfg
        export default {kit}
        `,
      output: { kit: { files: { lib: "x" } } },
    },
    {
      code: `export default {[{["__proto__"]: null}]: 1, kit:{files:{lib:"y"}}}`,
      output: { kit: { files: { lib: "y" } } },
    },
  ];
  for (const { code, output } of testCases) {
    it(code, () => {
      assert.deepStrictEqual(parseConfig(code), output);
    });
  }
});
