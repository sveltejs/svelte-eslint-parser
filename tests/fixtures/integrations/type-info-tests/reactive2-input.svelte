<script lang="ts">
    // https://github.com/ota-meshi/svelte-eslint-parser/issues/206
    let obj = {
      child: {
        title: "hello!",
      },
    };
  
    $: child = obj.child;
    $: title = child?.title ?? "Yo!";
</script>

{child}{title}
