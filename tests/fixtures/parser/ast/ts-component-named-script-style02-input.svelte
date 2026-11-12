<Script a="1">
  <p>{a}</p>
</Script>
<STYLE>
  <p>{b}</p>
</STYLE>
<script lang="ts">
  import Script from "./Script.svelte";
  import STYLE from "./STYLE.svelte";
  const s: string = "</SCRIPT>";
  let a = 1, b = 2;
</script>
<style>
  p::after { content: "</STYLE>"; }
</style>
