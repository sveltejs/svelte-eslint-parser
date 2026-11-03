<script lang="ts">
    let {
        count = $bindable(),
        a: b = $bindable(),
        c: { d = $bindable() },
        size = $bindable(5),
    }: {
        count: number;
        a: string;
        c: { d: boolean };
        size?: number;
    } = $props();

    function reset() {
        count = 0;
        b = "";
        d = false;
        size = 5;
    }
</script>

<button onclick={reset}>Reset</button>
