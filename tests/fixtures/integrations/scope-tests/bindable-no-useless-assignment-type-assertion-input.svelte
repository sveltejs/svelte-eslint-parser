<script lang="ts">
    type Props = {
        count: number;
        a: string;
        1: number;
        "x-y": string;
        k: boolean;
        t: number;
    };
    let {
        count = $bindable(),
        a: b = $bindable(),
        1: one = $bindable(),
        "x-y": xy = $bindable(),
        ["k"]: k = $bindable(),
        [`t`]: t = $bindable(),
    } = <Props>$props();

    function reset() {
        count = 0;
        b = "";
        one = 1;
        xy = "";
        k = false;
        t = 1;
    }
</script>

<button onclick={reset}>Reset</button>
