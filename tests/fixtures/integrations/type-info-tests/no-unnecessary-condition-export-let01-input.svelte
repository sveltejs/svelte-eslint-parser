<script lang="ts">
  export let href: string | undefined = undefined;
  export let variant: "primary" | "secondary" = "primary";
  export let item: { id: string } | undefined = undefined;
  let current = item;

  const url = href ?? "https://example.com";
  if (variant === "primary") {
    console.log(url);
  }
  function onMount() {
    if (current) console.log(current.id);
  }
  onMount();
</script>
