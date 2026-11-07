<script lang="ts">
  // Runes mode: `export` declares component exports, not props.
  let { n }: { n: number } = $props();
  let s: string | null = null;
  let d = $derived(s ?? String(n));
  let x: string | undefined = undefined;
  export { d, x };
  console.log(x ?? n);
</script>
