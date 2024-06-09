<script lang="ts">
    import Component from './ts-event03-input.svelte'; // Component: __sveltets_2_IsomorphicComponent<$$ComponentProps, { [evt: string]: CustomEvent<any>; }, {}, Record<string, any>, string>
</script>

<Component onfoo="{e=>{ // Component: __sveltets_2_IsomorphicComponent<$$ComponentProps, { [evt: string]: CustomEvent<any>; }, {}, Record<string, any>, string>, e: { detail: number; }
    // e.detail is number
    e.detail; // e.detail: number
}}" />
