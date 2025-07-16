<script lang="ts">
  const one = async () => {
    await new Promise((f) => setTimeout(f, 500)); // artificial delay
    return 1;
  };

  const two = async () => {
    await new Promise((f) => setTimeout(f, 500)); // artificial delay
    return 2;
  };

  // these will run sequentially the first time,
  // but will update independently
  let a = $derived(await one());
  let b = $derived(await two());
</script>

<p>{a}</p>
<p>{b}</p>