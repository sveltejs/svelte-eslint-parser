import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { spawnSync } from "child_process";

describe("parseForESLint", () => {
  describe("when a newer TypeScript is hoisted next to ESLint in a pnpm layout", () => {
    let root: string, app: string;

    // root/
    //   node_modules/.pnpm/
    //     eslint@10.0.0/node_modules/eslint       fake ESLint
    //     node_modules/typescript                 fake TS 7, hoisted by pnpm
    //   app/                                      cwd
    //     node_modules/eslint                     -> fake ESLint
    //     node_modules/@typescript-eslint/parser  -> real parser (uses real TS)
    //     tsconfig.json, App.svelte
    before(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), "load-typescript-"));
      app = path.join(root, "app");
      const store = path.join(root, "node_modules/.pnpm");
      const eslint = path.join(store, "eslint@10.0.0/node_modules/eslint");

      writePackage(eslint, "eslint", "10.0.0");
      writePackage(
        path.join(store, "node_modules/typescript"),
        "typescript",
        "7.0.0",
      );
      link(eslint, path.join(app, "node_modules/eslint"));
      // Resolves `typescript` from the repo, not the fake TS 7.
      link(
        path.dirname(
          createRequire(import.meta.url).resolve(
            "@typescript-eslint/parser/package.json",
          ),
        ),
        path.join(app, "node_modules/@typescript-eslint/parser"),
      );
      fs.writeFileSync(
        path.join(app, "tsconfig.json"),
        JSON.stringify({ compilerOptions: { allowJs: true }, include: ["*"] }),
      );
      fs.writeFileSync(path.join(app, "App.svelte"), "");
    });

    after(() => {
      fs.rmSync(root, { recursive: true, force: true });
    });

    it("uses the TypeScript that typescript-eslint uses", () => {
      // Child process so the cwd and linter lookups aren't cached from this run.
      const child = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx/esm",
          "--input-type=module",
          "-e",
          `
      import path from "path";
      import * as tsParser from "@typescript-eslint/parser";
      import { parseForESLint } from ${JSON.stringify(new URL("../../../../src/index.ts", import.meta.url).href)};
      // Plain <script> takes the JS path that loads TypeScript.
      process.chdir(${JSON.stringify(app)});
      parseForESLint("<script>let count = 0;</script>", {
        parser: tsParser,
        project: "tsconfig.json",
        tsconfigRootDir: process.cwd(),
        filePath: path.join(process.cwd(), "App.svelte"),
        extraFileExtensions: [".svelte"],
      });
      `,
        ],
        { encoding: "utf8" },
      );

      assert.strictEqual(child.stderr, "");
    });
  });
});

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
