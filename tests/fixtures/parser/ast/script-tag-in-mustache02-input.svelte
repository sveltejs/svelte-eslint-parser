<script>
  const jsonLd = { "@type": "Person", name: "a" };
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
</svelte:head>
