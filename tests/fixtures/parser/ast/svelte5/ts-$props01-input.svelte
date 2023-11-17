<script lang="ts">
  interface MyProps {
    a: number;
    b: string;
    c: boolean;
    d: number;
  }
  let { a, b, c, ...everythingElse } = $props<MyProps>();
</script>

{a}
{b}
{c}
{everythingElse}
