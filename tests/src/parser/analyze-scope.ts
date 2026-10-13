import assert from "assert";
import type * as eslint from "eslint";
import * as parser from "../../../src/index.js";

describe("virtual references", () => {
  it("marks writable $bindable props as value references", () => {
    const result = parser.parseForESLint(`
      <script>
        let { completed = $bindable(false) } = $props();
        completed = true;
      </script>
    `);
    const variable = result.scopeManager.scopes
      .flatMap((scope) => scope.variables)
      .find(({ name }) => name === "completed");
    const reference = variable?.references.find(
      (candidate) =>
        (
          candidate as eslint.Scope.Reference & {
            svelteVirtualReference?: boolean;
          }
        ).svelteVirtualReference,
    ) as
      | (eslint.Scope.Reference & {
          isTypeReference?: boolean;
          isValueReference?: boolean;
        })
      | undefined;

    assert.ok(reference);
    assert.strictEqual(reference.isValueReference, true);
    assert.strictEqual(reference.isTypeReference, false);
  });
});
