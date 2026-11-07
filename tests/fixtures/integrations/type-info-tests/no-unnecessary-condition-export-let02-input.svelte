<script lang="ts" context="module">
  export let moduleVar: string | undefined = undefined;
  console.log(moduleVar ?? "module");
</script>

<script lang="ts">
  let local: string | undefined = undefined;
  console.log(local ?? "local");
  export const constant: string | undefined = undefined;
  console.log(constant ?? "constant");

  let klass: string | undefined = undefined;
  export { klass as class };
  console.log(klass ?? "class");
  export let flag = false
  if (flag) console.log("flag");
  export let { a }: { a?: string } = {},
    [b]: (string | undefined)[] = [];
  console.log(a ?? b ?? "destructuring");
</script>
