<script lang="ts">
    type Props = { value: number; label: string };
    /** @type {Props} */
    let {
        value = $bindable(),
        label = 'label',
    } = $props();
</script>

<button onclick={() => (value = 0)}>{label}</button>
