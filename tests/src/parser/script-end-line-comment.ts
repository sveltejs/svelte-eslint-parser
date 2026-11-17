import assert from "assert";
import { Linter } from "eslint";
import * as tsParser from "@typescript-eslint/parser";
import * as parser from "../../../src/index.js";

function createConfig(rules: Linter.RulesRecord, ts: boolean): Linter.Config[] {
  return [
    {
      files: ["**/*.svelte"],
      languageOptions: {
        parser,
        parserOptions: ts ? { parser: tsParser } : {},
      },
      rules,
    },
  ];
}

describe("A line comment right before `</script>`", () => {
  for (const { lang, ts } of [
    { lang: "", ts: false },
    { lang: ' lang="ts"', ts: true },
  ]) {
    it(`works as an \`eslint-disable-line\` directive (${ts ? "TS" : "JS"})`, () => {
      const linter = new Linter();
      const code = `<script${lang}>console.log(1) // eslint-disable-line no-console</script>`;
      const messages = linter.verify(
        code,
        createConfig({ "no-console": "error" }, ts),
        "Component.svelte",
      );
      assert.deepStrictEqual(
        messages.map((m) => m.message),
        [],
      );
    });
  }

  it("keeps `</script>` with the `multiline-comment-style` autofix", () => {
    const linter = new Linter();
    const code = "<script>\n\t// first line\n\t// second line</script>\n";
    const config = createConfig({ "multiline-comment-style": "error" }, false);
    const result = linter.verifyAndFix(code, config, "Component.svelte");
    assert.strictEqual(
      result.output,
      "<script>\n\t/*\n\t * first line\n\t * second line\n\t */</script>\n",
    );
    assert.deepStrictEqual(result.messages, []);
  });
});
