<script lang="ts" context="module">
  export let moduleVar: string | undefined = undefined;
</script>

<script lang="ts">
  // comment
  export let a: string | undefined = undefined
  export let b = false;
  export let { c }: { c?: string } = {}, [d] = [1] // trailing
  let e: number | undefined, f = 1;
  export { e, f as g, e as h };
  export const i = 1;
  /** doc */
  export var j: string;
  let k = a ?? b;
</script>

{a}{b}{c}{d}{e}{f}{j}{k}
