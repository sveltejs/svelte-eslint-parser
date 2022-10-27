<script lang="ts">
$: aWithNewline = // $: any, aWithNewline: number
  42;
$: bWithNewline = // $: any, bWithNewline: number
  42
$: cWithNewline = // $: any, cWithNewline: number
  (42);
$: dWithNewline =( // $: any, dWithNewline: number
  42)
$: eWithNewline = // $: any, eWithNewline: number
  (42)
</script>

{aWithNewline}{bWithNewline}{cWithNewline}{dWithNewline}{eWithNewline} <!-- aWithNewline: number, bWithNewline: number, cWithNewline: number, dWithNewline: number, eWithNewline: number -->
  