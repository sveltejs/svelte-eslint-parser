import assert from "assert";
import * as tsParser from "@typescript-eslint/parser";
import { parseForESLint } from "../../../src/index.js";

describe("Script at the end of the file", () => {
  // The AST fixtures cannot cover this case yet, because the range of a line
  // comment right before `</script>` also covers the `</script>` tag.
  it("does not let a trailing line comment hide the virtual code", () => {
    const result = parseForESLint('<script lang="ts">let a = 1 // c</script>', {
      parser: tsParser,
    });
    const script = result.ast.body[0];
    assert.strictEqual(script.type, "SvelteScriptElement");
    assert.strictEqual(script.body.length, 1);
    assert.strictEqual(script.body[0].type, "VariableDeclaration");
    assert.strictEqual(result.ast.comments.length, 1);
    assert.strictEqual(result.ast.comments[0].value.trimEnd(), " c");
  });
});
