<script lang="ts">
    let {
        1: one = $bindable(),
        '2': two = $bindable(),
        [3]: three = $bindable(),
        ['a']: a = $bindable(),
        [`b`]: b = $bindable(),
        label = 'label',
    }: {
        1: number;
        2: number;
        3: number;
        a: string;
        b: string;
        label: string;
    } = $props();
</script>

<input bind:value={a} />
{one} {two} {three} {b} {label}
