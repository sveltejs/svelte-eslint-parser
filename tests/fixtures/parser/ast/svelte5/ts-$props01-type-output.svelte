<script lang="ts">
  interface MyProps { // MyProps: MyProps
    a: number; // a: number
    b: string; // b: string
    c: boolean; // c: boolean
    d: number; // d: number
  }
  let { a, b, c, ...everythingElse } = $props<MyProps>(); // a: number, a: number, b: string, b: string, c: boolean, c: boolean, everythingElse: { d: number; }, $props<MyProps>(): MyProps
</script>

{a} <!-- a: number -->
{b} <!-- b: Promise<{ x: number; }> -->
{c} <!-- c: Promise<{ x: number; }> -->
{everythingElse} <!-- everythingElse: { d: number; } -->
