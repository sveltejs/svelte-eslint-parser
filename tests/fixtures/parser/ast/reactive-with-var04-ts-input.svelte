<script lang="ts">
    let foo: number
    $: {
        foo = 1
    }
</script>

{foo}
