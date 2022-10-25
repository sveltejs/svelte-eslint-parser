
<script lang="ts">
export let foo: { bar: number } | null = null

let a
$: a = foo && foo.bar;

$: r = foo && foo.bar;

$: ({ bar: n } = foo || { bar: 42 });
</script>

{foo && foo.bar}
{r}
{n}
