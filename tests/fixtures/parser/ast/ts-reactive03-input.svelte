<script lang="ts">
    export let x = {s: "hello", n: 42}

    $: ({s, n} = x)
</script>

{s}
{n}
