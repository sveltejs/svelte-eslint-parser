<script lang="ts">
    let { count = $bindable() }: { count: number } = $props();

    function reset() {
        count = 0;
    }
</script>

<button onclick={reset}>Reset</button>
