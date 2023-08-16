<script lang="ts">
  import MyComponent, { ListItem } from "./lib/MyComponent.svelte"; // MyComponent: typeof Mycomponent__SvelteComponent_, ListItem: any, ListItem: any

  const items: ListItem[] = [ // items: ListItem[]
    {
      title: "Svelte.dev", // title: string
      link: "https://svelte.dev", // link: string
    },
    {
      title: "TypeScript ESLint", // title: string
      link: "https://typescript-eslint.io", // link: string
    },
    {
      title: "TypeScript", // title: string
      link: "https://www.typescriptlang.org", // link: string
    },
  ];

  const openLink = (item: ListItem) => { // openLink: (item: ListItem) => void, item: ListItem
    window.location.replace(item.link); // window.location.replace(item.link): void
  };
</script>

<main>
  <MyComponent {items} let:item> <!-- MyComponent: typeof Mycomponent__SvelteComponent_, items: ListItem[], items: ListItem[], item: ListItem -->
    <div>
      {item.title} <!-- item.title: string -->
      <button
        on:click={() => {
          openLink(item); // openLink(item): void
        }}>Open Link</button
      >
    </div>
  </MyComponent>
  <MyComponent {items}> <!-- MyComponent: typeof Mycomponent__SvelteComponent_, items: ListItem[], items: ListItem[] -->
    <div let:item> <!-- item: ListItem -->
      {item.title} <!-- item.title: string -->
      <button
        on:click={() => {
          openLink(item); // openLink(item): void
        }}>Open Link</button
      >
    </div>
    <span slot="count" let:count={foo}>{foo}</span> <!-- foo: number, foo: number -->
  </MyComponent>
</main>
