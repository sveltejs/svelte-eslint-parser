<script lang="ts">
  import Component, { ListItem } from "./lib/Component.svelte"; // Component: typeof SvelteComponent, ListItem: any, ListItem: any

  const items: ListItem[] = []; // items: ListItem[]
  const item = "outside"; // item: "outside"
</script>

<Component {items} let:item> <!-- Component: typeof SvelteComponent, items: ListItem[], items: ListItem[], item: any -->
  <div>
    {item.title} <!-- item.title: any -->
  </div>
  <span slot="count" let:count> <!-- count: any -->
    {item} {count} <!-- item: "outside", count: any -->
  </span>
</Component>
