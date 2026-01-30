import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import {
  generateTsconfig,
  getGeneratedTsconfigPath,
} from "../../../src/virtual-code/tsconfig-generator.js";

describe("tsconfig-generator", () => {
  describe("generateTsconfig", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "svelte-parser-tsconfig-test-"),
      );
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true });
    });

    it("should generate tsconfig with extends", () => {
      const projectRoot = tempDir;
      const cacheDir = path.join(projectRoot, ".svelte-eslint-parser");
      fs.mkdirSync(cacheDir);

      // Create original tsconfig
      const originalTsconfig = path.join(projectRoot, "tsconfig.json");
      fs.writeFileSync(
        originalTsconfig,
        JSON.stringify({ compilerOptions: { strict: true } }),
      );

      const generatedPath = generateTsconfig(
        projectRoot,
        cacheDir,
        originalTsconfig,
      );

      assert.ok(fs.existsSync(generatedPath));

      const content = JSON.parse(fs.readFileSync(generatedPath, "utf-8"));
      assert.ok(content.extends.endsWith("tsconfig.json"));
      assert.ok(Array.isArray(content.include));
      assert.ok(
        content.include.some((p: string) =>
          p.includes("**/*.svelte.__virtual__.ts"),
        ),
      );
      // Check rootDirs is set for correct relative path resolution
      assert.ok(Array.isArray(content.compilerOptions.rootDirs));
      assert.strictEqual(content.compilerOptions.rootDirs.length, 2);
    });

    it("should handle null original tsconfig", () => {
      const projectRoot = tempDir;
      const cacheDir = path.join(projectRoot, ".svelte-eslint-parser");
      fs.mkdirSync(cacheDir);

      const generatedPath = generateTsconfig(projectRoot, cacheDir, null);

      assert.ok(fs.existsSync(generatedPath));

      const content = JSON.parse(fs.readFileSync(generatedPath, "utf-8"));
      assert.ok(content.extends.includes("tsconfig.json"));
    });

    it("should handle path aliases from original tsconfig", () => {
      const projectRoot = tempDir;
      const cacheDir = path.join(projectRoot, ".svelte-eslint-parser");
      fs.mkdirSync(cacheDir);

      // Create original tsconfig with path aliases
      const originalTsconfig = path.join(projectRoot, "tsconfig.json");
      fs.writeFileSync(
        originalTsconfig,
        JSON.stringify({
          compilerOptions: {
            baseUrl: ".",
            paths: {
              "$lib/*": ["src/lib/*"],
              "@/*": ["src/*"],
            },
          },
        }),
      );

      const generatedPath = generateTsconfig(
        projectRoot,
        cacheDir,
        originalTsconfig,
      );

      const content = JSON.parse(fs.readFileSync(generatedPath, "utf-8"));

      // baseUrl should be set to cache directory
      assert.ok(content.compilerOptions.baseUrl);
      assert.strictEqual(content.compilerOptions.baseUrl, ".");

      // paths should include both cache directory and project root paths
      // This allows resolving .svelte.ts files from cache and other files from project root
      assert.ok(content.compilerOptions.paths);
      assert.deepStrictEqual(content.compilerOptions.paths["$lib/*"], [
        "src/lib/*", // cache directory
        "../src/lib/*", // project root
      ]);
      assert.deepStrictEqual(content.compilerOptions.paths["@/*"], [
        "src/*", // cache directory
        "../src/*", // project root
      ]);
    });
  });

  describe("getGeneratedTsconfigPath", () => {
    it("should return correct path", () => {
      const cacheDir = "/path/to/.svelte-eslint-parser";
      const result = getGeneratedTsconfigPath(cacheDir);

      assert.strictEqual(result, path.join(cacheDir, "tsconfig.json"));
    });
  });
});
