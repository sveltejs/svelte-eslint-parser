<script>
  import { writable } from "svelte/store";

  /** @param {number} x */
  function test(x) {
    return x + 1;
  }

  /** @typedef {{ name: string, count: number }} Item */
  /** @type {Item[]} */
  const items = [{ name: "one", count: 1 }];
  const store = writable(items);
  $: total = test($store[0].count);

  /**
   * @template T
   * @param {T} value
   * @returns {T}
   */
  function identity(value) {
    return value;
  }

  /** @param {any} value */
  function unsafe(value) {
    return value;
  }
</script>

{total.toFixed()}
{#each $store as item}
  {identity(item).name.toUpperCase()}
{/each}
{#await Promise.resolve(items) then result}
  {result[0].count.toFixed()}
{/await}
