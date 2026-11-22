import assert from "assert";
import * as tsParser from "@typescript-eslint/parser";
import { Linter } from "eslint";
import * as parser from "../../../src/index.js";

describe("Script at the end of the file", () => {
  it("does not let a trailing line comment hide the virtual code", () => {
    const result = parser.parseForESLint(
      '<script lang="ts">let a = 1 // c</script>',
      { parser: tsParser },
    );
    const script = result.ast.body[0];
    assert.strictEqual(script.type, "SvelteScriptElement");
    assert.strictEqual(script.body.length, 1);
    assert.strictEqual(script.body[0].type, "VariableDeclaration");
    assert.strictEqual(result.ast.comments.length, 1);
    assert.strictEqual(result.ast.comments[0].value, " c");
    assert.deepStrictEqual(result.ast.comments[0].range, [28, 32]);
  });
});

describe("Line comment right before `</script>`", () => {
  for (const { name, code, parserOptions } of [
    {
      name: "espree",
      code: "<script>let a = 1; // eslint-disable-line no-console</script>\n",
      parserOptions: {},
    },
    {
      name: "@typescript-eslint/parser",
      code: '<script lang="ts">let a = 1; // eslint-disable-line no-console</script>\n',
      parserOptions: { parser: tsParser },
    },
  ]) {
    it(`does not remove \`</script>\` when fixing an unused directive (${name})`, () => {
      const linter = new Linter();
      const result = linter.verifyAndFix(
        code,
        [
          {
            files: ["**/*.svelte"],
            languageOptions: { parser, parserOptions },
            linterOptions: { reportUnusedDisableDirectives: "error" },
          },
        ],
        "test.svelte",
      );
      // ESLint replaces the removed directive comment with a space.
      assert.strictEqual(
        result.output,
        code.replace("// eslint-disable-line no-console", " "),
      );
      assert.deepStrictEqual(result.messages, []);
    });
  }
});
