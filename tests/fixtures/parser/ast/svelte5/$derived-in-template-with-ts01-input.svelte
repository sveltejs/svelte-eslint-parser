<script lang="ts">
    import MyComponent from './MyComponent.svelte';
</script>

<MyComponent :foo={() => $derived(0)} />
