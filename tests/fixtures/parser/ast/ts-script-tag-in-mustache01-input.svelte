<script lang="ts">
  function f(): void {}
</script>

{@html `<script>(${f.toString()})();</script>`}
