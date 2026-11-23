<script lang="ts">
  import Component, { ListItem } from "./lib/Component.svelte"; // Component: __sveltets_2_IsomorphicComponent<__sveltets_2_PropsWithChildren<{ items?: ListItem[] | undefined; }, { default: { item: ListItem; }; count: { count: number; }; }>, { ...; }, { ...; }, Record<...>, string>, ListItem: any, ListItem: any

  const items: ListItem[] = []; // items: ListItem[]
  const item = "outside"; // item: "outside"
</script>

<Component {items} let:item> <!-- Component: __sveltets_2_IsomorphicComponent<__sveltets_2_PropsWithChildren<{ items?: ListItem[] | undefined; }, { default: { item: ListItem; }; count: { count: number; }; }>, { ...; }, { ...; }, Record<...>, string>, items: ListItem[], items: ListItem[], item: ListItem -->
  <div>
    {item.title} <!-- item.title: string -->
  </div>
  <span slot="count" let:count> <!-- count: number -->
    {item} {count} <!-- item: "outside", count: number -->
  </span>
</Component>
