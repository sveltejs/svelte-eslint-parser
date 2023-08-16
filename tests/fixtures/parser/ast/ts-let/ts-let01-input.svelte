<script lang="ts">
  import MyComponent, { ListItem } from "./lib/MyComponent.svelte";

  const items: ListItem[] = [
    {
      title: "Svelte.dev",
      link: "https://svelte.dev",
    },
    {
      title: "TypeScript ESLint",
      link: "https://typescript-eslint.io",
    },
    {
      title: "TypeScript",
      link: "https://www.typescriptlang.org",
    },
  ];

  const openLink = (item: ListItem) => {
    window.location.replace(item.link);
  };
</script>

<main>
  <MyComponent {items} let:item>
    <div>
      {item.title}
      <button
        on:click={() => {
          openLink(item);
        }}>Open Link</button
      >
    </div>
  </MyComponent>
  <MyComponent {items}>
    <div let:item>
      {item.title}
      <button
        on:click={() => {
          openLink(item);
        }}>Open Link</button
      >
    </div>
    <span slot="count" let:count={foo}>{foo}</span>
  </MyComponent>
</main>
