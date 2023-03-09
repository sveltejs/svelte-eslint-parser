<script lang="ts">
    import {createEventDispatcher} from 'svelte' // createEventDispatcher: <EventMap extends {} = any>() => <EventKey extends Extract<keyof EventMap, string>>(type: EventKey, detail?: EventMap[EventKey] | undefined, options?: DispatchOptions | undefined) => boolean, createEventDispatcher: <EventMap extends {} = any>() => <EventKey extends Extract<keyof EventMap, string>>(type: EventKey, detail?: EventMap[EventKey] | undefined, options?: DispatchOptions | undefined) => boolean
    const emit = createEventDispatcher<{ // emit: <EventKey extends "foo" | "bar">(type: EventKey, detail?: { foo: number; bar: string; }[EventKey] | undefined, options?: DispatchOptions | undefined) => boolean, createEventDispatcher<{ foo: number, bar: string }>(): <EventKey extends "foo" | "bar">(type: EventKey, detail?: { foo: number; bar: string; }[EventKey] | undefined, options?: DispatchOptions | undefined) => boolean
        foo: number,
        bar: string
    }>()
    emit('foo', 1) // emit('foo', 1): boolean
</script>

<button on:click="{e=>{ // e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; }
    e.currentTarget; // e.currentTarget: EventTarget & HTMLButtonElement
}}"></button>
<input on:input="{e=>{ // e: Event & { currentTarget: EventTarget & HTMLInputElement; }
    e.currentTarget; // e.currentTarget: EventTarget & HTMLInputElement
}}">
