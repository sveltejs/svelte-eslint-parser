<script lang="ts">
  import Component, { ListItem } from "./lib/Component.svelte";

  const items: ListItem[] = [];
  const item = "outside";
</script>

<Component {items} let:item>
  <div>
    {item.title}
  </div>
  <span slot="count" let:count>
    {item} {count}
  </span>
</Component>
