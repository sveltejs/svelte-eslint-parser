import assert from "assert";
import * as parser from "../../src/index.js";
import pkg from "../../package.json" with { type: "json" };
const { version } = pkg;
const expectedMeta = {
  name: "svelte-eslint-parser",
  version,
};

describe("Test for meta object", () => {
  it("A parser should have a meta object.", () => {
    assert.deepStrictEqual({ ...parser.meta }, expectedMeta);
  });
});
