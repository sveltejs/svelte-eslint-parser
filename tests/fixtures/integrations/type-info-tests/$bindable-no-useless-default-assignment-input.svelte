<script lang="ts">
    let {
        count = $bindable(),
        ref = $bindable(null),
        'aria-label': ariaLabel = $bindable(''),
        label = 'default',
        optional = 'default',
    }: {
        count: number;
        ref: HTMLElement | null;
        'aria-label': string;
        label: string;
        optional?: string;
    } = $props();
</script>

<button aria-label={ariaLabel} onclick={() => (count = 0)}>{label} {optional}</button>
<div bind:this={ref}></div>
