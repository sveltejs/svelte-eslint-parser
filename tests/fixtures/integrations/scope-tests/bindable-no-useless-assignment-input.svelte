<script lang="ts">
    let { count = $bindable() }: { count: number } = $props();

    function reset() {
        count = 0;
    }

    function other() {
        let x = 1;
        x = 2;
        return x;
    }
</script>

<button onclick={reset}>Reset</button>
<button onclick={other}>Other</button>
