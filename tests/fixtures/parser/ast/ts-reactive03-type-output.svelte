<script lang="ts">
    export let x = {s: "hello", n: 42} // x: { s: string; n: number; }, s: string, n: number

    $: ({s, n} = x) // $: any, s: string, s: string, n: number, n: number, x: { s: string; n: number; }
</script>

{s} <!-- s: string -->
{n} <!-- n: number -->
