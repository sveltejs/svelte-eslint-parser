<script lang="ts">
    let {
        value = $bindable(),
        label = 'label',
    }: {
        value: number;
        label: string;
    } = $props()!;
</script>

<button onclick={() => (value = 0)}>{label}</button>
