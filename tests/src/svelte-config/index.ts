import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { parseForESLint } from "../../../src/index.js";
import { resolveSvelteConfigFromOption } from "../../../src/svelte-config/index.js";
import { svelteVersion } from "../../../src/parser/svelte-version.js";

/** Creates a temp dir with the given files, and removes it after the callback. */
function withFiles(
  files: Record<string, string>,
  callback: (dir: string) => void,
): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-config-"));
  try {
    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(dir, name);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }
    callback(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const VITE_CONFIG_RUNES_FALSE = `
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
export default defineConfig({
  plugins: [sveltekit({ compilerOptions: { runes: false }, files: { routes: "src/r" } })],
});
`;
const VITE_CONFIG_NO_ARGS = `
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
export default defineConfig({ plugins: [sveltekit()] });
`;
const SVELTE_CONFIG_RUNES_TRUE = `
export default { compilerOptions: { runes: true }, kit: { files: { lib: "src/l" } } };
`;

describe("resolveSvelteConfigFromOption", () => {
  it("reads the plugin options from vite.config.js", () => {
    withFiles(
      {
        "vite.config.js": VITE_CONFIG_RUNES_FALSE,
        "src/App.svelte": "",
      },
      (dir) => {
        assert.deepStrictEqual(
          resolveSvelteConfigFromOption({
            filePath: path.join(dir, "src/App.svelte"),
          }),
          { compilerOptions: { runes: false }, files: { routes: "src/r" } },
        );
      },
    );
  });

  it("merges vite.config.js with svelte.config.js in the same directory", () => {
    withFiles(
      {
        "vite.config.js": VITE_CONFIG_RUNES_FALSE,
        "svelte.config.js": SVELTE_CONFIG_RUNES_TRUE,
        "src/App.svelte": "",
      },
      (dir) => {
        assert.deepStrictEqual(
          resolveSvelteConfigFromOption({
            filePath: path.join(dir, "src/App.svelte"),
          }),
          {
            compilerOptions: { runes: false },
            kit: { files: { lib: "src/l" } },
            files: { routes: "src/r" },
          },
        );
      },
    );
  });

  it("vite runes win over svelte.config.js runes", () => {
    withFiles(
      {
        "vite.config.js": `
          import { svelte } from "@sveltejs/vite-plugin-svelte";
          export default { plugins: [svelte({ compilerOptions: { runes: true } })] };
          `,
        "svelte.config.js": `export default { compilerOptions: { runes: false } };`,
        "src/App.svelte": "",
      },
      (dir) => {
        assert.deepStrictEqual(
          resolveSvelteConfigFromOption({
            filePath: path.join(dir, "src/App.svelte"),
          }),
          { compilerOptions: { runes: true } },
        );
      },
    );
  });

  it("uses svelte.config.js runes if the plugin options have no runes", () => {
    withFiles(
      {
        "vite.config.js": `
          import { svelte } from "@sveltejs/vite-plugin-svelte";
          export default { plugins: [svelte({ hot: false })] };
          `,
        "svelte.config.js": `export default { compilerOptions: { runes: false } };`,
        "src/App.svelte": "",
      },
      (dir) => {
        assert.deepStrictEqual(
          resolveSvelteConfigFromOption({
            filePath: path.join(dir, "src/App.svelte"),
          }),
          { compilerOptions: { runes: false } },
        );
      },
    );
  });

  it("uses vite.config.js before vite.config.ts, like Vite", () => {
    withFiles(
      {
        "vite.config.js": `
          import { sveltekit } from "@sveltejs/kit/vite";
          export default { plugins: [sveltekit({ compilerOptions: { runes: true } })] };
          `,
        "vite.config.ts": `
          import { sveltekit } from "@sveltejs/kit/vite";
          export default { plugins: [sveltekit({ compilerOptions: { runes: false } })] };
          `,
        "src/App.svelte": "",
      },
      (dir) => {
        assert.deepStrictEqual(
          resolveSvelteConfigFromOption({
            filePath: path.join(dir, "src/App.svelte"),
          }),
          { compilerOptions: { runes: true } },
        );
      },
    );
  });

  it("uses only the first vite config file", () => {
    withFiles(
      {
        "vite.config.js": VITE_CONFIG_NO_ARGS,
        "vite.config.ts": `
          import { sveltekit } from "@sveltejs/kit/vite";
          export default { plugins: [sveltekit({ compilerOptions: { runes: false } })] };
          `,
        "src/App.svelte": "",
      },
      (dir) => {
        assert.strictEqual(
          resolveSvelteConfigFromOption({
            filePath: path.join(dir, "src/App.svelte"),
          }),
          null,
        );
      },
    );
  });

  it("falls back to svelte.config.js if the plugin has no argument", () => {
    withFiles(
      {
        "vite.config.js": VITE_CONFIG_NO_ARGS,
        "svelte.config.js": SVELTE_CONFIG_RUNES_TRUE,
        "src/App.svelte": "",
      },
      (dir) => {
        assert.deepStrictEqual(
          resolveSvelteConfigFromOption({
            filePath: path.join(dir, "src/App.svelte"),
          }),
          {
            compilerOptions: { runes: true },
            kit: { files: { lib: "src/l" } },
          },
        );
      },
    );
  });

  it("falls back to svelte.config.js if vite.config.js cannot be parsed", () => {
    withFiles(
      {
        "vite.config.js": "export default {{{",
        "svelte.config.js": SVELTE_CONFIG_RUNES_TRUE,
        "src/App.svelte": "",
      },
      (dir) => {
        assert.deepStrictEqual(
          resolveSvelteConfigFromOption({
            filePath: path.join(dir, "src/App.svelte"),
          })?.compilerOptions,
          { runes: true },
        );
      },
    );
  });

  it("keeps walking up to a parent directory", () => {
    withFiles(
      {
        "vite.config.js": VITE_CONFIG_RUNES_FALSE,
        "packages/app/vite.config.js": VITE_CONFIG_NO_ARGS,
        "packages/app/src/App.svelte": "",
      },
      (dir) => {
        assert.deepStrictEqual(
          resolveSvelteConfigFromOption({
            filePath: path.join(dir, "packages/app/src/App.svelte"),
          })?.compilerOptions,
          { runes: false },
        );
      },
    );
  });

  // Uses `module.stripTypeScriptTypes()` on Node.js 22.13+,
  // and the `typescript` package (a dev dependency) on older versions.
  it("reads vite.config.ts with type annotations", () => {
    withFiles(
      {
        "vite.config.ts": `
          import { defineConfig, type UserConfig } from "vite";
          import { sveltekit } from "@sveltejs/kit/vite";
          const options: Record<string, unknown> = { compilerOptions: { runes: false } };
          export default defineConfig({ plugins: [sveltekit(options)] } satisfies UserConfig);
          `,
        "src/App.svelte": "",
      },
      (dir) => {
        assert.deepStrictEqual(
          resolveSvelteConfigFromOption({
            filePath: path.join(dir, "src/App.svelte"),
          }),
          { compilerOptions: { runes: false } },
        );
      },
    );
  });

  it("explicit svelteConfig wins", () => {
    withFiles(
      {
        "vite.config.js": VITE_CONFIG_RUNES_FALSE,
        "src/App.svelte": "",
      },
      (dir) => {
        const svelteConfig = { compilerOptions: { runes: true } };
        assert.strictEqual(
          resolveSvelteConfigFromOption({
            filePath: path.join(dir, "src/App.svelte"),
            svelteConfig,
          }),
          svelteConfig,
        );
      },
    );
  });
});

describe("parseForESLint with vite.config.js", () => {
  if (!svelteVersion.gte(5)) return;
  for (const runes of [true, false]) {
    it(`detects runes: ${runes}`, () => {
      withFiles(
        {
          "vite.config.js": `
            import { sveltekit } from "@sveltejs/kit/vite";
            export default { plugins: [sveltekit({ compilerOptions: { runes: ${runes} } })] };
            `,
          "src/App.svelte": "<script>let a = 1;</script>{a}",
        },
        (dir) => {
          const filePath = path.join(dir, "src/App.svelte");
          const result = parseForESLint(fs.readFileSync(filePath, "utf8"), {
            filePath,
          });
          assert.strictEqual(result.services.svelteParseContext?.runes, runes);
        },
      );
    });
  }
});
