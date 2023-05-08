import assert from "assert";
import * as parser from "../../src";
import { version } from "../../package.json";
const expectedMeta = {
  name: "svelte-eslint-parser",
  version,
};

describe("Test for meta object", () => {
  it("A parser should have a meta object.", () => {
    assert.deepStrictEqual(parser.meta, expectedMeta);
  });
});
