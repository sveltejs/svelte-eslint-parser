<!-- from https://github.com/sveltejs/eslint-plugin-svelte/issues/484 -->
<script lang="ts">
import Pagination from "../components/Pagination.svelte";

let page = 1;
const perPage = 15;
$: pageStart = perPage * (page - 1);
</script>

{#each array as _}
  <div on:click={() => {}} />
{/each}

<Pagination bind:current={page} />
