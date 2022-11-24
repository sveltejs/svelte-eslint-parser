<script lang="ts">
    let x = "hello" // x: string
    const get = ()=>"hello" // get: () => string

    $: y = x // $: any, y: string, x: string
    $: z = y // $: any, z: string, y: string
    $: getFunction = get // $: any, getFunction: () => string, get: () => string
</script>

<input title={z} bind:value={x}> <!-- z: string, x: string -->
{getFunction()} <!-- getFunction(): string -->
