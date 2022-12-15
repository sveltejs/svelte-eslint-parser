<script lang="ts">
    export let message: string|undefined;
    export const formatMessage = async (message: string): Promise<string> => {
        return new Promise(resolve => {
        resolve(message);
        });
    };
</script>

{#if !message}
    No message
{:else}
    {#await formatMessage(message)}
        Loading...
    {:then result}
        {result}
    {/await}
{/if}