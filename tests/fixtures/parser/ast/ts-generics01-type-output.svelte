<script lang="ts" generics="T extends boolean, X"> // T: boolean, X: unknown
    import {createEventDispatcher} from "svelte"; // createEventDispatcher: <EventMap extends Record<string, any> = any>() => EventDispatcher<EventMap>, createEventDispatcher: <EventMap extends Record<string, any> = any>() => EventDispatcher<EventMap>

    export let array1: T[]; // array1: boolean[]
    export let item1: T; // item1: boolean
    export let array2: X[]; // array2: unknown[]

    const dispatch = createEventDispatcher<{arrayItemClick: X}>(); // dispatch: EventDispatcher<{ arrayItemClick: unknown; }>, createEventDispatcher<{arrayItemClick: X}>(): EventDispatcher<{ arrayItemClick: unknown; }>
</script>
