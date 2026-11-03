<script lang="ts">
    let {
        value = $bindable(),
        a = 'a',
        label = 'label',
    } = $props<{
        value: number;
        a: string | undefined;
        label: string;
    }>();
</script>

<button onclick={() => (value = 0)}>{a} {label}</button>
