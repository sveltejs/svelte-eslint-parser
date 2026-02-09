import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import {
  rewriteImportPaths,
  type ImportRewriterContext,
} from "../../../src/virtual-code/import-rewriter.js";
import { readTsConfigWithExtends } from "../../../src/virtual-code/tsconfig-reader.js";

describe("import-rewriter", () => {
  describe("rewriteImportPaths", () => {
    it("should return code unchanged when context is null", () => {
      const code = "import Component from './Component.svelte'";
      const result = rewriteImportPaths(code, null);

      assert.strictEqual(result, code);
    });

    it("should not modify any imports when context is null", () => {
      const code = `
import A from './A.svelte'
import B from "./B.svelte"
import { c } from './c.ts'
import D from '$lib/D.svelte'
`;
      const result = rewriteImportPaths(code, null);

      assert.strictEqual(result, code);
    });

    describe("with context", () => {
      const projectRoot = "/project";
      const cacheDir = "/project/.svelte-eslint-parser";

      it("should rewrite relative .svelte imports", () => {
        const context: ImportRewriterContext = {
          virtualFilePath: path.join(cacheDir, "src/App.svelte.__virtual__.ts"),
          cacheDir,
          projectRoot,
          pathAliases: null,
          baseUrl: null,
          compilerOptions: null,
        };
        const code = "import Button from './Button.svelte'";
        const result = rewriteImportPaths(code, context);

        // Should rewrite to point to .d.ts file in cache
        assert.strictEqual(result, "import Button from './Button.svelte.d'");
      });

      it("should rewrite parent directory .svelte imports", () => {
        const context: ImportRewriterContext = {
          virtualFilePath: path.join(
            cacheDir,
            "src/components/Button.svelte.__virtual__.ts",
          ),
          cacheDir,
          projectRoot,
          pathAliases: null,
          baseUrl: null,
          compilerOptions: null,
        };
        const code = "import Layout from '../Layout.svelte'";
        const result = rewriteImportPaths(code, context);

        assert.strictEqual(result, "import Layout from '../Layout.svelte.d'");
      });

      it("should rewrite path alias .svelte imports using TypeScript module resolution", () => {
        // Create a temporary directory structure with tsconfig
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-test-"));
        const srcLibDir = path.join(tmpDir, "src", "lib");
        const cacheDirectory = path.join(tmpDir, ".svelte-eslint-parser");
        const cacheSrcDir = path.join(cacheDirectory, "src");

        try {
          fs.mkdirSync(srcLibDir, { recursive: true });
          fs.mkdirSync(cacheSrcDir, { recursive: true });

          // Create a tsconfig with path aliases
          const tsconfigPath = path.join(tmpDir, "tsconfig.json");
          fs.writeFileSync(
            tsconfigPath,
            JSON.stringify({
              compilerOptions: {
                baseUrl: ".",
                paths: {
                  "$lib/*": ["src/lib/*"],
                },
              },
            }),
          );

          // Create a .svelte file (so TypeScript can resolve it)
          fs.writeFileSync(
            path.join(srcLibDir, "Button.svelte"),
            "<script>export let label;</script>",
          );

          const tsConfigInfo = readTsConfigWithExtends(tsconfigPath);
          assert.ok(tsConfigInfo, "tsConfigInfo should not be null");

          const context: ImportRewriterContext = {
            virtualFilePath: path.join(
              cacheSrcDir,
              "App.svelte.__virtual__.ts",
            ),
            cacheDir: cacheDirectory,
            projectRoot: tmpDir,
            pathAliases: tsConfigInfo.paths,
            baseUrl: tsConfigInfo.baseUrl,
            compilerOptions: tsConfigInfo.compilerOptions,
          };
          const code = "import Button from '$lib/Button.svelte'";
          const result = rewriteImportPaths(code, context);

          // Should rewrite to relative path to .d.ts in cache
          assert.strictEqual(
            result,
            "import Button from './lib/Button.svelte.d'",
          );
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });

      it("should rewrite multiple import patterns", () => {
        // Create a temporary directory structure with tsconfig
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-test-"));
        const srcLibDir = path.join(tmpDir, "src", "lib");
        const srcDir = path.join(tmpDir, "src");
        const cacheDirectory = path.join(tmpDir, ".svelte-eslint-parser");
        const cacheSrcDir = path.join(cacheDirectory, "src");

        try {
          fs.mkdirSync(srcLibDir, { recursive: true });
          fs.mkdirSync(cacheSrcDir, { recursive: true });

          // Create a tsconfig with path aliases
          const tsconfigPath = path.join(tmpDir, "tsconfig.json");
          fs.writeFileSync(
            tsconfigPath,
            JSON.stringify({
              compilerOptions: {
                baseUrl: ".",
                paths: {
                  "$lib/*": ["src/lib/*"],
                },
              },
            }),
          );

          // Create .svelte files
          fs.writeFileSync(path.join(srcDir, "A.svelte"), "");
          fs.writeFileSync(path.join(srcLibDir, "B.svelte"), "");
          fs.writeFileSync(path.join(srcDir, "C.svelte"), "");
          fs.writeFileSync(path.join(srcDir, "D.svelte"), "");

          const tsConfigInfo = readTsConfigWithExtends(tsconfigPath);
          assert.ok(tsConfigInfo, "tsConfigInfo should not be null");

          const context: ImportRewriterContext = {
            virtualFilePath: path.join(
              cacheSrcDir,
              "App.svelte.__virtual__.ts",
            ),
            cacheDir: cacheDirectory,
            projectRoot: tmpDir,
            pathAliases: tsConfigInfo.paths,
            baseUrl: tsConfigInfo.baseUrl,
            compilerOptions: tsConfigInfo.compilerOptions,
          };
          const code = `
import A from './A.svelte'
import B from "$lib/B.svelte"
const C = import('./C.svelte')
import './D.svelte'
`;
          const result = rewriteImportPaths(code, context);

          assert.ok(result.includes("from './A.svelte.d'"));
          assert.ok(result.includes('from "./lib/B.svelte.d"'));
          assert.ok(result.includes("import('./C.svelte.d')"));
          assert.ok(result.includes("import './D.svelte.d'"));
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });

      it("should not modify non-.svelte imports", () => {
        const context: ImportRewriterContext = {
          virtualFilePath: path.join(cacheDir, "src/App.svelte.__virtual__.ts"),
          cacheDir,
          projectRoot,
          pathAliases: null,
          baseUrl: null,
          compilerOptions: null,
        };
        const code = `
import { foo } from './foo.ts'
import bar from './bar.js'
import type { Baz } from './baz'
`;
        const result = rewriteImportPaths(code, context);

        assert.strictEqual(result, code);
      });

      it("should handle path alias with baseUrl using TypeScript module resolution", () => {
        // Create a temporary directory structure with tsconfig
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-test-"));
        const srcDir = path.join(tmpDir, "src");
        const srcComponentsDir = path.join(srcDir, "components");
        const cacheDirectory = path.join(tmpDir, ".svelte-eslint-parser");
        const cacheSrcDir = path.join(cacheDirectory, "src");

        try {
          fs.mkdirSync(srcComponentsDir, { recursive: true });
          fs.mkdirSync(cacheSrcDir, { recursive: true });

          // Create a tsconfig with path aliases
          const tsconfigPath = path.join(tmpDir, "tsconfig.json");
          fs.writeFileSync(
            tsconfigPath,
            JSON.stringify({
              compilerOptions: {
                baseUrl: "src",
                paths: {
                  "@/*": ["*"],
                },
              },
            }),
          );

          // Create a .svelte file
          fs.writeFileSync(path.join(srcComponentsDir, "Button.svelte"), "");

          const tsConfigInfo = readTsConfigWithExtends(tsconfigPath);
          assert.ok(tsConfigInfo, "tsConfigInfo should not be null");

          const context: ImportRewriterContext = {
            virtualFilePath: path.join(
              cacheSrcDir,
              "App.svelte.__virtual__.ts",
            ),
            cacheDir: cacheDirectory,
            projectRoot: tmpDir,
            pathAliases: tsConfigInfo.paths,
            baseUrl: tsConfigInfo.baseUrl,
            compilerOptions: tsConfigInfo.compilerOptions,
          };
          const code = "import Button from '@/components/Button.svelte'";
          const result = rewriteImportPaths(code, context);

          // Should resolve @/components/Button.svelte to src/components/Button.svelte
          assert.strictEqual(
            result,
            "import Button from './components/Button.svelte.d'",
          );
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });

      it("should rewrite imports to project root when .svelte.ts file exists", () => {
        // Create a temporary directory structure
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-test-"));
        const srcDir = path.join(tmpDir, "src");
        const cacheDirectory = path.join(tmpDir, ".svelte-eslint-parser");
        const cacheSrcDir = path.join(cacheDirectory, "src");

        try {
          fs.mkdirSync(srcDir, { recursive: true });
          fs.mkdirSync(cacheSrcDir, { recursive: true });

          // Create a .svelte.ts file (module script for a Svelte component)
          fs.writeFileSync(
            path.join(srcDir, "Button.svelte.ts"),
            "export const buttonLabel = 'Click me';",
          );

          const context: ImportRewriterContext = {
            virtualFilePath: path.join(
              cacheSrcDir,
              "App.svelte.__virtual__.ts",
            ),
            cacheDir: cacheDirectory,
            projectRoot: tmpDir,
            pathAliases: null,
            baseUrl: null,
            compilerOptions: null,
          };

          const code = "import Button from './Button.svelte'";
          const result = rewriteImportPaths(code, context);

          // Should rewrite to explicit path to .svelte.ts in project root
          // to avoid TypeScript resolving to .svelte.d.ts in cache directory
          assert.strictEqual(
            result,
            "import Button from '../../src/Button.svelte.ts'",
          );
        } finally {
          // Cleanup
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });

      it("should rewrite imports to project root when .svelte.js file exists", () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-test-"));
        const srcDir = path.join(tmpDir, "src");
        const cacheDirectory = path.join(tmpDir, ".svelte-eslint-parser");
        const cacheSrcDir = path.join(cacheDirectory, "src");

        try {
          fs.mkdirSync(srcDir, { recursive: true });
          fs.mkdirSync(cacheSrcDir, { recursive: true });

          // Create a .svelte.js file
          fs.writeFileSync(
            path.join(srcDir, "Button.svelte.js"),
            "export const buttonLabel = 'Click me';",
          );

          const context: ImportRewriterContext = {
            virtualFilePath: path.join(
              cacheSrcDir,
              "App.svelte.__virtual__.ts",
            ),
            cacheDir: cacheDirectory,
            projectRoot: tmpDir,
            pathAliases: null,
            baseUrl: null,
            compilerOptions: null,
          };

          const code = "import Button from './Button.svelte'";
          const result = rewriteImportPaths(code, context);

          // Should rewrite to explicit path to .svelte.js in project root
          // to avoid TypeScript resolving to .svelte.d.ts in cache directory
          assert.strictEqual(
            result,
            "import Button from '../../src/Button.svelte.js'",
          );
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });

      it("should rewrite path alias imports to project root when .svelte.ts file exists", () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-test-"));
        const srcLibDir = path.join(tmpDir, "src", "lib");
        const cacheDirectory = path.join(tmpDir, ".svelte-eslint-parser");
        const cacheSrcRoutesDir = path.join(
          cacheDirectory,
          "src",
          "routes",
          "app",
        );

        try {
          fs.mkdirSync(srcLibDir, { recursive: true });
          fs.mkdirSync(cacheSrcRoutesDir, { recursive: true });

          // Create a tsconfig with path aliases
          const tsconfigPath = path.join(tmpDir, "tsconfig.json");
          fs.writeFileSync(
            tsconfigPath,
            JSON.stringify({
              compilerOptions: {
                baseUrl: ".",
                paths: {
                  "$lib/*": ["src/lib/*"],
                },
              },
            }),
          );

          // Create a .svelte.ts file
          fs.writeFileSync(
            path.join(srcLibDir, "table-state-manager.svelte.ts"),
            "export const tablesCache = {};",
          );

          const tsConfigInfo = readTsConfigWithExtends(tsconfigPath);
          assert.ok(tsConfigInfo, "tsConfigInfo should not be null");

          const context: ImportRewriterContext = {
            virtualFilePath: path.join(
              cacheSrcRoutesDir,
              "Page.svelte.__virtual__.ts",
            ),
            cacheDir: cacheDirectory,
            projectRoot: tmpDir,
            pathAliases: tsConfigInfo.paths,
            baseUrl: tsConfigInfo.baseUrl,
            compilerOptions: tsConfigInfo.compilerOptions,
          };

          const code =
            "import { tablesCache } from '$lib/table-state-manager.svelte'";
          const result = rewriteImportPaths(code, context);

          // Should rewrite to explicit path to .svelte.ts in project root
          // to avoid TypeScript resolving to .svelte.d.ts in cache directory
          assert.strictEqual(
            result,
            "import { tablesCache } from '../../../../src/lib/table-state-manager.svelte.ts'",
          );
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });

      it("should rewrite explicit .svelte.ts imports to project root", () => {
        // Create a temporary directory structure
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-test-"));
        const srcDir = path.join(tmpDir, "src");
        const cacheDirectory = path.join(tmpDir, ".svelte-eslint-parser");
        const cacheSrcDir = path.join(cacheDirectory, "src");

        try {
          fs.mkdirSync(srcDir, { recursive: true });
          fs.mkdirSync(cacheSrcDir, { recursive: true });

          // Create a .svelte.ts file (module script for a Svelte component)
          fs.writeFileSync(
            path.join(srcDir, "Button.svelte.ts"),
            "export const buttonLabel = 'Click me';",
          );

          const context: ImportRewriterContext = {
            virtualFilePath: path.join(
              cacheSrcDir,
              "App.svelte.__virtual__.ts",
            ),
            cacheDir: cacheDirectory,
            projectRoot: tmpDir,
            pathAliases: null,
            baseUrl: null,
            compilerOptions: null,
          };

          // Import path already ends with .svelte.ts
          const code = "import { buttonLabel } from './Button.svelte.ts'";
          const result = rewriteImportPaths(code, context);

          // Should rewrite to explicit path to .svelte.ts in project root
          assert.strictEqual(
            result,
            "import { buttonLabel } from '../../src/Button.svelte.ts'",
          );
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });

      it("should rewrite explicit .svelte.js imports to project root", () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-test-"));
        const srcDir = path.join(tmpDir, "src");
        const cacheDirectory = path.join(tmpDir, ".svelte-eslint-parser");
        const cacheSrcDir = path.join(cacheDirectory, "src");

        try {
          fs.mkdirSync(srcDir, { recursive: true });
          fs.mkdirSync(cacheSrcDir, { recursive: true });

          // Create a .svelte.js file
          fs.writeFileSync(
            path.join(srcDir, "Button.svelte.js"),
            "export const buttonLabel = 'Click me';",
          );

          const context: ImportRewriterContext = {
            virtualFilePath: path.join(
              cacheSrcDir,
              "App.svelte.__virtual__.ts",
            ),
            cacheDir: cacheDirectory,
            projectRoot: tmpDir,
            pathAliases: null,
            baseUrl: null,
            compilerOptions: null,
          };

          // Import path already ends with .svelte.js
          const code = "import { buttonLabel } from './Button.svelte.js'";
          const result = rewriteImportPaths(code, context);

          // Should rewrite to explicit path to .svelte.js in project root
          assert.strictEqual(
            result,
            "import { buttonLabel } from '../../src/Button.svelte.js'",
          );
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });
    });
  });
});
