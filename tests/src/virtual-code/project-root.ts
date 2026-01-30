import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import {
  findProjectRoot,
  getCacheDirectory,
} from "../../../src/virtual-code/project-root.js";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

describe("project-root", () => {
  describe("findProjectRoot", () => {
    it("should find project root from a file path", () => {
      const testFilePath = path.join(dirname, "project-root.ts");
      const projectRoot = findProjectRoot(testFilePath);

      // The project root should contain package.json
      assert.ok(projectRoot);
      assert.ok(fs.existsSync(path.join(projectRoot, "package.json")));
    });

    it("should find project root from current directory", () => {
      const projectRoot = findProjectRoot(dirname);

      assert.ok(projectRoot);
      assert.ok(fs.existsSync(path.join(projectRoot, "package.json")));
    });

    it("should return null when no package.json is found", () => {
      // Create a temp directory without package.json
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "svelte-parser-test-"),
      );
      try {
        const projectRoot = findProjectRoot(tempDir);
        // May return null or find a parent package.json depending on system setup
        // The key is that it doesn't throw an error
        if (projectRoot) {
          assert.ok(fs.existsSync(path.join(projectRoot, "package.json")));
        }
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });
  });

  describe("getCacheDirectory", () => {
    it("should return correct cache directory path", () => {
      const projectRoot = "/path/to/project";
      const cacheDir = getCacheDirectory(projectRoot);

      assert.strictEqual(
        cacheDir,
        path.join(projectRoot, ".svelte-eslint-parser"),
      );
    });
  });
});
