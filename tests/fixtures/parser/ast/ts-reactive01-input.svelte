<script lang="ts">
    let x = "hello"
    const get = ()=>"hello"

    $: y = x
    $: z = y
    $: getFunction = get
</script>

<input title={z} bind:value={x}>
{getFunction()}
