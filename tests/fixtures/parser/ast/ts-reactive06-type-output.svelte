
<script lang="ts">
export let foo: { bar: number } | null = null // foo: { bar: number; } | null

let a // a: any
$: a = foo && foo.bar; // $: any, a: any, foo: { bar: number; } | null, foo.bar: number

$: r = foo && foo.bar; // $: any, r: number | null, foo: { bar: number; } | null, foo.bar: number

$: ({ bar: n } = foo || { bar: 42 }); // $: any, bar: any, n: number, foo: { bar: number; } | null, bar: number
</script>

{foo && foo.bar} <!-- foo: { bar: number; } | null, foo.bar: number -->
{r} <!-- r: number | null -->
{n} <!-- n: number -->
