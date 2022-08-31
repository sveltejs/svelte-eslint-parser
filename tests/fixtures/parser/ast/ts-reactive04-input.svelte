<script lang="ts">
    const xx = "hello"
    let yy: number

    $: yy = xx
    $: zz = xx
</script>

{yy}
{zz}
