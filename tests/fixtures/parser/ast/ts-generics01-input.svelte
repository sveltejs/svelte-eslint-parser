<script lang="ts" generics="T extends boolean, X">
    import {createEventDispatcher} from "svelte";

    export let array1: T[];
    export let item1: T;
    export let array2: X[];

    const dispatch = createEventDispatcher<{arrayItemClick: X}>();
</script>
