export const PARSE_ATTRIBUTES_CASES: { input: string; index?: number }[] = [
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
