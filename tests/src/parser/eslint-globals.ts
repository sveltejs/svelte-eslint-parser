import { describe, it } from "node:test";
import { Linter } from "eslint";
import assert from "assert";
import * as tsParser from "@typescript-eslint/parser";
import * as parser from "../../../src/index.js";

// ESLint 10 resolves configured and `/* global */` globals by calling `ScopeManager#addGlobals()`.
// https://eslint.org/docs/latest/use/migrate-to-10.0.0#-new-requirements-for-scopemanager-implementations

const BASE_PARSER_OPTIONS = {
  ecmaVersion: "latest",
  sourceType: "module",
} as const;

const LANGS = [
  { name: "JavaScript", lang: "", parserOptions: {} },
  {
    name: "TypeScript",
    lang: ' lang="ts"',
    parserOptions: { parser: tsParser },
  },
];

describe("globals with ESLint Linter", () => {
  for (const { name, lang, parserOptions } of LANGS) {
    describe(name, () => {
      function lint(code: string, globals?: Linter.Globals) {
        const linter = new Linter();
        return linter
          .verify(
            code,
            {
              files: ["**/*.svelte"],
              languageOptions: {
                parser,
                parserOptions: { ...BASE_PARSER_OPTIONS, ...parserOptions },
                globals: globals ?? {},
              },
              rules: {
                "no-undef": "error",
                "no-unused-vars": "error",
                "no-global-assign": "error",
              },
            },
            "test.svelte",
          )
          .map((m) => ({ ruleId: m.ruleId, message: m.message, line: m.line }));
      }

      it("resolves `/* global */` comments in script and template", () => {
        const code = `<script${lang}>
/* global foo, unusedGlobal */
foo();
</script>
<p>{foo} {bar}</p>
`;
        assert.deepStrictEqual(lint(code), [
          {
            ruleId: "no-unused-vars",
            message: "'unusedGlobal' is defined but never used.",
            line: 2,
          },
          {
            ruleId: "no-undef",
            message: "'bar' is not defined.",
            line: 5,
          },
        ]);
      });

      it("resolves `languageOptions.globals` in script and template", () => {
        const code = `<script${lang}>
myGlobal();
myWritable = 1;
myReadonly = 1;
</script>
<p>{myGlobal} {myReadonly} {unknownGlobal}</p>
`;
        assert.deepStrictEqual(
          lint(code, {
            myGlobal: "readonly",
            myWritable: "writable",
            myReadonly: "readonly",
          }),
          [
            {
              ruleId: "no-global-assign",
              message: "Read-only global 'myReadonly' should not be modified.",
              line: 4,
            },
            {
              ruleId: "no-undef",
              message: "'unknownGlobal' is not defined.",
              line: 6,
            },
          ],
        );
      });

      it("keeps Svelte globals and local variables resolved", () => {
        const code = `<script${lang}>
let count = 0;
let unused = 1;
</script>
<p>{count} {$$props.value}</p>
`;
        assert.deepStrictEqual(lint(code), [
          {
            ruleId: "no-unused-vars",
            message: "'unused' is assigned a value but never used.",
            line: 3,
          },
        ]);
      });

      it("provides `ScopeManager#addGlobals()`", () => {
        const code = `<script${lang}>
foo();
</script>
<p>{foo}</p>
`;
        const result = parser.parseForESLint(code, {
          ...BASE_PARSER_OPTIONS,
          ...parserOptions,
        });
        const scopeManager = result.scopeManager;
        assert.strictEqual(typeof scopeManager.addGlobals, "function");
        const globalScope = scopeManager.globalScope!;
        assert.deepStrictEqual(
          globalScope.through.map((r) => r.identifier.name),
          ["foo", "foo"],
        );

        scopeManager.addGlobals(["foo"]);

        const variable = globalScope.set.get("foo")!;
        assert.ok(variable);
        assert.strictEqual(variable.references.length, 2);
        assert.ok(variable.references.every((r) => r.resolved === variable));
        assert.deepStrictEqual(globalScope.through, []);
      });
    });
  }
});
