import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import {
  generateHash,
  loadHashMap,
  saveHashMap,
} from "../../../src/virtual-code/hash.js";

describe("hash", () => {
  describe("generateHash", () => {
    it("should generate consistent hash for same content", () => {
      const content = "Hello, World!";
      const hash1 = generateHash(content);
      const hash2 = generateHash(content);

      assert.strictEqual(hash1, hash2);
    });

    it("should generate different hash for different content", () => {
      const hash1 = generateHash("Hello");
      const hash2 = generateHash("World");

      assert.notStrictEqual(hash1, hash2);
    });

    it("should generate a 64-character hex string", () => {
      const hash = generateHash("test");

      assert.strictEqual(hash.length, 64);
      assert.ok(/^[0-9a-f]+$/.test(hash));
    });
  });

  describe("loadHashMap and saveHashMap", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "svelte-parser-hash-test-"),
      );
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true });
    });

    it("should return empty map when file does not exist", () => {
      const hashMap = loadHashMap(tempDir, "1.0.0");

      assert.strictEqual(hashMap.size, 0);
    });

    it("should save and load hash map", () => {
      const originalMap = new Map([
        ["file1.svelte", "hash1"],
        ["file2.svelte", "hash2"],
      ]);

      saveHashMap(tempDir, originalMap, "1.0.0");
      const loadedMap = loadHashMap(tempDir, "1.0.0");

      assert.strictEqual(loadedMap.size, 2);
      assert.strictEqual(loadedMap.get("file1.svelte"), "hash1");
      assert.strictEqual(loadedMap.get("file2.svelte"), "hash2");
    });

    it("should invalidate cache on version mismatch", () => {
      const originalMap = new Map([["file.svelte", "hash"]]);

      saveHashMap(tempDir, originalMap, "1.0.0");
      const loadedMap = loadHashMap(tempDir, "2.0.0");

      assert.strictEqual(loadedMap.size, 0);
    });
  });
});
