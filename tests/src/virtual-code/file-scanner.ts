import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import { scanSvelteFiles } from "../../../src/virtual-code/file-scanner.js";

describe("file-scanner", () => {
  describe("scanSvelteFiles", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "svelte-parser-scan-test-"),
      );
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true });
    });

    it("should find .svelte files", () => {
      // Create test files
      fs.writeFileSync(path.join(tempDir, "App.svelte"), "<script></script>");
      fs.writeFileSync(
        path.join(tempDir, "Button.svelte"),
        "<script></script>",
      );

      const files = scanSvelteFiles(tempDir);

      assert.strictEqual(files.length, 2);
      assert.ok(files.some((f) => f.endsWith("App.svelte")));
      assert.ok(files.some((f) => f.endsWith("Button.svelte")));
    });

    it("should find .svelte files in subdirectories", () => {
      // Create subdirectory and files
      fs.mkdirSync(path.join(tempDir, "components"));
      fs.writeFileSync(path.join(tempDir, "App.svelte"), "<script></script>");
      fs.writeFileSync(
        path.join(tempDir, "components", "Button.svelte"),
        "<script></script>",
      );

      const files = scanSvelteFiles(tempDir);

      assert.strictEqual(files.length, 2);
      assert.ok(files.some((f) => f.endsWith("App.svelte")));
      assert.ok(
        files.some(
          (f) => f.includes("components") && f.endsWith("Button.svelte"),
        ),
      );
    });

    it("should exclude node_modules", () => {
      // Create node_modules directory with svelte file
      fs.mkdirSync(path.join(tempDir, "node_modules"));
      fs.writeFileSync(path.join(tempDir, "App.svelte"), "<script></script>");
      fs.writeFileSync(
        path.join(tempDir, "node_modules", "pkg.svelte"),
        "<script></script>",
      );

      const files = scanSvelteFiles(tempDir);

      assert.strictEqual(files.length, 1);
      assert.ok(files[0].endsWith("App.svelte"));
      assert.ok(!files.some((f) => f.includes("node_modules")));
    });

    it("should exclude .svelte-eslint-parser directory", () => {
      // Create cache directory with svelte file
      fs.mkdirSync(path.join(tempDir, ".svelte-eslint-parser"));
      fs.writeFileSync(path.join(tempDir, "App.svelte"), "<script></script>");
      fs.writeFileSync(
        path.join(tempDir, ".svelte-eslint-parser", "cached.svelte"),
        "<script></script>",
      );

      const files = scanSvelteFiles(tempDir);

      assert.strictEqual(files.length, 1);
      assert.ok(files[0].endsWith("App.svelte"));
    });

    it("should return empty array for empty directory", () => {
      const files = scanSvelteFiles(tempDir);

      assert.strictEqual(files.length, 0);
    });
  });
});
