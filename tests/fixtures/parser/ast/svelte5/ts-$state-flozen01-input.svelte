<script lang="ts">
  let numbers = $state.frozen([1, 2, 3]);
  let unused = $state.frozen(["a", "b", "c"]);
</script>

<button onclick="{() => (numbers = [...numbers, numbers.length + 1])}">
  push
</button>

<button onclick="{() => (numbers = numbers.slice(0, -1))}"> pop </button>

<p>
  {numbers.join(" + ") || 0}
  =
  {numbers.reduce((a, b) => a + b, 0)}
</p>
