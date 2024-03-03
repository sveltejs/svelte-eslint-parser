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
      input: "<style global>",
      index: 6,
    },
    {
      input: "<style global/>",
      index: 6,
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
    {
      input: `expr={true}  `,
    },
    {
      input: `expr="{true}"  `,
    },
    {
      input: `expr='{true}'  `,
    },
    {
      input: `expr={"s"}  `,
    },
    {
      input: `expr={"}"}  `,
    },
    {
      input: `expr={/*}*/"}"}  `,
    },
    {
      input: `expr={/*}*///}\n"}"}  `,
    },
  ];
  for (const { input, index } of testCases) {
    it(input || "(empty)", () => {
      chai.expect(parseAttributes(input, index || 0)).toMatchSnapshot();
    });
  }
});
