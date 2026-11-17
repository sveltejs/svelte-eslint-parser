import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

describe("loadTypeScript", () => {
  let root: string;

  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "load-typescript-"));
  });

  after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe("when installed with npm", () => {
    let app: string;

    // npm-app/  (cwd)
    // └── node_modules/
    //     ├── eslint
    //     ├── @typescript-eslint/parser
    //     ├── @typescript-eslint/typescript-estree
    //     └── typescript  6.0.0
    before(() => {
      app = path.join(root, "npm-app");
      const modules = path.join(app, "node_modules");

      writePackage(path.join(modules, "eslint"), "eslint", "10.0.0");
      writePackage(
        path.join(modules, "@typescript-eslint/parser"),
        "@typescript-eslint/parser",
        "8.0.0",
      );
      writePackage(
        path.join(modules, "@typescript-eslint/typescript-estree"),
        "@typescript-eslint/typescript-estree",
        "8.0.0",
      );
      writePackage(path.join(modules, "typescript"), "typescript", "6.0.0");
    });

    it("loads the app's TypeScript", () => {
      assert.strictEqual(loadedTypeScriptVersion(app), "6.0.0");
    });
  });

  describe("when installed with pnpm in a monorepo that also uses a newer TypeScript", () => {
    let app: string;

    // pnpm-monorepo/
    // ├── node_modules/.pnpm/
    // │   ├── eslint@10.0.0/node_modules/eslint
    // │   ├── @typescript-eslint+parser@8.0.0/node_modules/@typescript-eslint/parser
    // │   ├── @typescript-eslint+parser@8.0.0/node_modules/@typescript-eslint/typescript-estree  -> @typescript-eslint+typescript-estree@8.0.0
    // │   ├── @typescript-eslint+typescript-estree@8.0.0/node_modules/@typescript-eslint/typescript-estree
    // │   ├── @typescript-eslint+typescript-estree@8.0.0/node_modules/typescript  -> typescript@6.0.0
    // │   ├── typescript@6.0.0/node_modules/typescript
    // │   ├── typescript@7.0.0/node_modules/typescript
    // │   └── node_modules/typescript  -> typescript@7.0.0, hoisted
    // └── sveltekit-app/  (cwd)
    //     └── node_modules/
    //         ├── eslint  -> eslint@10.0.0
    //         ├── @typescript-eslint/parser  -> @typescript-eslint+parser@8.0.0
    //         └── typescript  -> typescript@6.0.0
    before(() => {
      const monorepo = path.join(root, "pnpm-monorepo");
      const store = path.join(monorepo, "node_modules/.pnpm");
      const eslint = path.join(store, "eslint@10.0.0/node_modules/eslint");
      const parser = path.join(
        store,
        "@typescript-eslint+parser@8.0.0/node_modules/@typescript-eslint/parser",
      );
      const estreeModules = path.join(
        store,
        "@typescript-eslint+typescript-estree@8.0.0/node_modules",
      );
      const estree = path.join(
        estreeModules,
        "@typescript-eslint/typescript-estree",
      );
      const ts6 = path.join(store, "typescript@6.0.0/node_modules/typescript");
      const ts7 = path.join(store, "typescript@7.0.0/node_modules/typescript");
      app = path.join(monorepo, "sveltekit-app");

      writePackage(eslint, "eslint", "10.0.0");
      writePackage(parser, "@typescript-eslint/parser", "8.0.0");
      writePackage(estree, "@typescript-eslint/typescript-estree", "8.0.0");
      writePackage(ts6, "typescript", "6.0.0");
      writePackage(ts7, "typescript", "7.0.0");
      link(estree, path.join(path.dirname(parser), "typescript-estree"));
      link(ts6, path.join(estreeModules, "typescript"));
      link(ts7, path.join(store, "node_modules/typescript"));
      link(eslint, path.join(app, "node_modules/eslint"));
      link(parser, path.join(app, "node_modules/@typescript-eslint/parser"));
      link(ts6, path.join(app, "node_modules/typescript"));
    });

    it("loads the app's TypeScript", () => {
      assert.strictEqual(loadedTypeScriptVersion(app), "6.0.0");
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
