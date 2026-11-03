<script lang="ts" generics="T">
    interface Props {
        value: number;
        a: string | undefined;
        b: string | null | undefined;
        onchange: ((v: number) => void) | undefined;
        items: T[] | undefined;
        optional?: string;
        readonly label: string;
    }
    let {
        value = $bindable(),
        a = 'a',
        b = 'b',
        onchange = () => {},
        items = [],
        optional = 'optional',
        label = 'label',
    }: Props = $props();
</script>

<button onclick={() => onchange?.(value)}>{a} {b} {items.length} {optional} {label}</button>
