import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { resolveTypeScriptFromTSESLint } from "../../../src/utils/cjs-module.js";

function writePackage(dir: string, name: string, version: string) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name, version, main: "index.js" }),
  );
  fs.writeFileSync(
    path.join(dir, "index.js"),
    `module.exports = { version: ${JSON.stringify(version)} };`,
  );
}

function link(target: string, linkPath: string) {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync(target, linkPath, "junction");
}

describe("resolveTypeScriptFromTSESLint", () => {
  describe("when a newer TypeScript is hoisted next to ESLint in a pnpm layout", () => {
    let root: string, requireFromLinter: NodeJS.Require;

    before(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), "cjs-module-"));
      const store = path.join(root, "node_modules/.pnpm");
      const ts6 = path.join(store, "typescript@6.0.0/node_modules/typescript");
      const ts7 = path.join(store, "typescript@7.0.0/node_modules/typescript");
      const estreeDeps = path.join(
        store,
        "@typescript-eslint+typescript-estree@8.0.0_typescript@6.0.0/node_modules",
      );
      const parserDeps = path.join(
        store,
        "@typescript-eslint+parser@8.0.0_typescript@6.0.0/node_modules",
      );
      const eslint = path.join(store, "eslint@10.0.0/node_modules/eslint");

      writePackage(ts6, "typescript", "6.0.0");
      writePackage(ts7, "typescript", "7.0.0");
      writePackage(
        path.join(estreeDeps, "@typescript-eslint/typescript-estree"),
        "@typescript-eslint/typescript-estree",
        "8.0.0",
      );
      link(ts6, path.join(estreeDeps, "typescript"));
      writePackage(
        path.join(parserDeps, "@typescript-eslint/parser"),
        "@typescript-eslint/parser",
        "8.0.0",
      );
      link(
        path.join(estreeDeps, "@typescript-eslint/typescript-estree"),
        path.join(parserDeps, "@typescript-eslint/typescript-estree"),
      );
      writePackage(eslint, "eslint", "10.0.0");
      link(ts7, path.join(store, "node_modules/typescript"));
      link(
        path.join(parserDeps, "@typescript-eslint/parser"),
        path.join(store, "node_modules/@typescript-eslint/parser"),
      );

      requireFromLinter = createRequire(
        path.join(eslint, "__placeholder__.js"),
      );
    });

    after(() => {
      fs.rmSync(root, { recursive: true, force: true });
    });

    it("returns the TypeScript that typescript-estree uses", () => {
      const ts = resolveTypeScriptFromTSESLint<{ version: string }>([
        requireFromLinter,
      ]);

      assert.strictEqual(ts?.version, "6.0.0");
    });
  });

  describe("when @typescript-eslint/parser cannot be resolved", () => {
    let root: string;

    before(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), "cjs-module-"));
    });

    after(() => {
      fs.rmSync(root, { recursive: true, force: true });
    });

    it("returns null", () => {
      const ts = resolveTypeScriptFromTSESLint([
        createRequire(path.join(root, "__placeholder__.js")),
      ]);

      assert.strictEqual(ts, null);
    });
  });
});
