<script lang="ts">
  type Info = { foo: number };
  let i: Info | null = null;
  export const d = $derived(i?.foo ? fn(i.foo) : null);

  setTimeout(() => {
    i = { foo: 42 };
  }, 10);

  function fn(a: number): number {
    return a;
  }
</script>

{d}
