<script>
    import MyComponent from './MyComponent.svelte';
</script>

<MyComponent :foo={() => $derived(0)} />
