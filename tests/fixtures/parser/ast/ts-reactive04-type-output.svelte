<script lang="ts">
    const xx = "hello" // xx: "hello"
    let yy: number // yy: number

    $: yy = xx // $: any, yy: number, xx: "hello"
    $: zz = xx // $: any, zz: string, xx: "hello"
</script>

{yy} <!-- yy: number -->
{zz} <!-- zz: string -->
