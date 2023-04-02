<script lang="ts">
    // https://github.com/sveltejs/svelte-eslint-parser/issues/206
    let obj = {
      child: {
        title: "hello!",
      },
    };
  
    $: child = obj.child;
    $: title = child?.title ?? "Yo!";
</script>

{child}{title}
