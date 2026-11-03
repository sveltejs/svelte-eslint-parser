import assert from "assert";
import { parseForESLint } from "../../../src/index.js";
import { generateParserOptions } from "./test-utils.js";

const code = `<svelte:options runes={false} />

<script>
	const { p } = $props();
</script>
`;

describe("Runes mode precedence", () => {
  it("does not call compilerOptions.runes when <svelte:options runes> is set", () => {
    let called = false;
    const result = parseForESLint(
      code,
      generateParserOptions({
        filePath: "test.svelte",
        svelteConfig: {
          compilerOptions: {
            runes: () => {
              called = true;
              throw new Error("compilerOptions.runes should not be called");
            },
          },
        },
      }),
    );
    assert.strictEqual(called, false);
    assert.strictEqual(result.services.svelteParseContext.runes, false);
  });
});
