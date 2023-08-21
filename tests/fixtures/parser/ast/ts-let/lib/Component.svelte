<script lang="ts" context="module">
  export interface ListItem {
    title: string;
    link: string;
  }
</script>

<script lang="ts">
  export let items: ListItem[] = [];
</script>

<div>
  <ul>
    {#each items as item (item.title)}
      <li>
        <slot {item} />
      </li>
    {/each}
  </ul>
</div>
<slot name="count" count={items.length} />
