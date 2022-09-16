import chai from "chai";
import { jestSnapshotPlugin } from "mocha-chai-jest-snapshot";

import { parseAttributes } from "../../../src/parser/html";

chai.use(jestSnapshotPlugin());
describe("parseAttributes", () => {
  const testCases = [
    {
      input: 'attr="value"',
    },
    {
      input: '<script lang="ts">',
      index: 7,
    },
    {
      input: "<script lang='ts'>",
      index: 7,
    },
    {
      input: "<script lang=ts>",
      index: 7,
    },
    {
      input: "",
    },
    {
      input: 'attr  =  "value"',
    },
    {
      input: "attr",
    },
    {
      input: "attr  ",
    },
    {
      input: `empty=""  `,
    },
    {
      input: `empty=''  `,
    },
    {
      input: `quote="'"  `,
    },
    {
      input: `quote='"'  `,
    },
  ];
  for (const { input, index } of testCases) {
    it(input, () => {
      chai.expect(parseAttributes(input, index || 0)).toMatchSnapshot();
    });
  }
});
