import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { spawnSync } from "child_process";

const require = createRequire(import.meta.url);
const typescriptVersion: string = require("typescript/package.json").version;

describe("loadTypeScript", () => {
  let root: string, app: string;

  // root/
  //   app/                                      cwd
  //     node_modules/@typescript-eslint/parser  -> real parser (uses real TS)
  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "load-typescript-"));
    app = path.join(root, "app");
    link(
      path.dirname(require.resolve("@typescript-eslint/parser/package.json")),
      path.join(app, "node_modules/@typescript-eslint/parser"),
    );
  });

  after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("loads the TypeScript that typescript-eslint uses", () => {
    assert.strictEqual(loadedTypeScriptVersion(app), typescriptVersion);
  });

  describe("when a newer TypeScript is hoisted next to ESLint by pnpm", () => {
    // root/
    //   node_modules/.pnpm/
    //     eslint@10.0.0/node_modules/eslint  fake ESLint
    //     node_modules/typescript            fake TS 7, hoisted by pnpm
    //   app/
    //     node_modules/eslint                -> fake ESLint
    before(() => {
      const store = path.join(root, "node_modules/.pnpm");
      const eslint = path.join(store, "eslint@10.0.0/node_modules/eslint");

      writePackage(eslint, "eslint", "10.0.0");
      writePackage(
        path.join(store, "node_modules/typescript"),
        "typescript",
        "7.0.0",
      );
      link(eslint, path.join(app, "node_modules/eslint"));
    });

    it("loads the TypeScript that typescript-eslint uses", () => {
      assert.strictEqual(loadedTypeScriptVersion(app), typescriptVersion);
    });
  });
});

/** Call loadTypeScript from `cwd` in a child process, since cwd and linter lookups are cached. */
function loadedTypeScriptVersion(cwd: string): string {
  const child = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx/esm",
      "--input-type=module",
      "-e",
      `
      import { loadTypeScript } from ${JSON.stringify(new URL("../../../src/utils/cjs-module.ts", import.meta.url).href)};
      process.chdir(${JSON.stringify(cwd)});
      process.stdout.write(loadTypeScript().version);
      `,
    ],
    { encoding: "utf8" },
  );
  assert.strictEqual(child.stderr, "");
  return child.stdout;
}

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
