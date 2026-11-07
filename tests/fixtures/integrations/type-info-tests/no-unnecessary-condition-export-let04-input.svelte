<script lang="ts">
  export let a: string | undefined = undefined;$: b = a ?? "x";
  export let c: string | undefined = undefined;$: c = c ?? "y";
  const z = a ?? c;
</script>
