<script lang="ts">
    let x = "hello"
    const get = ()=>"hello"

    $: y = x
    $: z = y
    $: foo = get
</script>

<input title={z} bind:value={x}>
{foo()}
