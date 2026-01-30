import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import {
  VirtualCodeCacheManager,
  resetVirtualCodeCacheManager,
} from "../../../src/virtual-code/manager.js";
import type { NormalizedParserOptions } from "../../../src/parser/parser-options.js";

describe("manager", () => {
  describe("VirtualCodeCacheManager", () => {
    let tempDir: string;

    beforeEach(() => {
      resetVirtualCodeCacheManager();
      tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "svelte-parser-manager-test-"),
      );
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true });
    });

    it("should not initialize without package.json", () => {
      const manager = new VirtualCodeCacheManager();
      const filePath = path.join(tempDir, "test.svelte");
      fs.writeFileSync(filePath, "<script lang='ts'>let x = 1;</script>");

      const parserOptions: NormalizedParserOptions = {
        ecmaVersion: 2024,
        sourceType: "module",
        loc: true,
        range: true,
        raw: true,
        tokens: true,
        comment: true,
        eslintVisitorKeys: true,
        eslintScopeManager: true,
        filePath,
      };

      manager.initialize(filePath, parserOptions, () => null);

      // Should not be initialized without package.json
      assert.strictEqual(manager.isInitialized(), false);
    });

    it("should initialize with package.json", () => {
      // Create package.json
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const manager = new VirtualCodeCacheManager();
      const filePath = path.join(tempDir, "test.svelte");
      fs.writeFileSync(filePath, "<script lang='ts'>let x = 1;</script>");

      const parserOptions: NormalizedParserOptions = {
        ecmaVersion: 2024,
        sourceType: "module",
        loc: true,
        range: true,
        raw: true,
        tokens: true,
        comment: true,
        eslintVisitorKeys: true,
        eslintScopeManager: true,
        filePath,
      };

      manager.initialize(filePath, parserOptions, (fp, content) => {
        // Simple mock that returns the content wrapped
        return `// Virtual code for ${path.basename(fp)}\n${content}`;
      });

      assert.strictEqual(manager.isInitialized(), true);
      assert.strictEqual(manager.getProjectRoot(), tempDir);
    });

    it("should generate virtual files", () => {
      // Create package.json and svelte file
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const svelteFile = path.join(tempDir, "App.svelte");
      fs.writeFileSync(svelteFile, "<script lang='ts'>let x = 1;</script>");

      const manager = new VirtualCodeCacheManager();
      const parserOptions: NormalizedParserOptions = {
        ecmaVersion: 2024,
        sourceType: "module",
        loc: true,
        range: true,
        raw: true,
        tokens: true,
        comment: true,
        eslintVisitorKeys: true,
        eslintScopeManager: true,
        filePath: svelteFile,
      };

      manager.initialize(svelteFile, parserOptions, () => {
        return { code: "let x: number = 1;", svelteImports: [] };
      });

      // Check if virtual file was created
      const virtualFile = path.join(
        tempDir,
        ".svelte-eslint-parser",
        "App.svelte.__virtual__.ts",
      );
      assert.ok(fs.existsSync(virtualFile));
    });

    it("should generate tsconfig", () => {
      // Create package.json and tsconfig.json
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );
      fs.writeFileSync(
        path.join(tempDir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: { strict: true } }),
      );

      const svelteFile = path.join(tempDir, "App.svelte");
      fs.writeFileSync(svelteFile, "<script lang='ts'>let x = 1;</script>");

      const manager = new VirtualCodeCacheManager();
      const parserOptions: NormalizedParserOptions = {
        ecmaVersion: 2024,
        sourceType: "module",
        loc: true,
        range: true,
        raw: true,
        tokens: true,
        comment: true,
        eslintVisitorKeys: true,
        eslintScopeManager: true,
        filePath: svelteFile,
      };

      manager.initialize(svelteFile, parserOptions, () => {
        return { code: "let x: number = 1;", svelteImports: [] };
      });

      const generatedTsconfig = manager.getGeneratedTsconfigPath();
      assert.ok(generatedTsconfig);
      assert.ok(fs.existsSync(generatedTsconfig));

      const content = JSON.parse(fs.readFileSync(generatedTsconfig, "utf-8"));
      assert.ok(content.extends);
    });

    it("should detect file updates", () => {
      // Create package.json and svelte file
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const svelteFile = path.join(tempDir, "App.svelte");
      fs.writeFileSync(svelteFile, "<script lang='ts'>let x = 1;</script>");

      const manager = new VirtualCodeCacheManager();
      const parserOptions: NormalizedParserOptions = {
        ecmaVersion: 2024,
        sourceType: "module",
        loc: true,
        range: true,
        raw: true,
        tokens: true,
        comment: true,
        eslintVisitorKeys: true,
        eslintScopeManager: true,
        filePath: svelteFile,
      };

      manager.initialize(svelteFile, parserOptions, () => {
        return { code: "let x: number = 1;", svelteImports: [] };
      });

      // Same content should not need update
      const originalContent = "<script lang='ts'>let x = 1;</script>";
      assert.strictEqual(
        manager.needsUpdate(svelteFile, originalContent),
        false,
      );

      // Different content should need update
      const newContent = "<script lang='ts'>let x = 2;</script>";
      assert.strictEqual(manager.needsUpdate(svelteFile, newContent), true);
    });
  });
});
