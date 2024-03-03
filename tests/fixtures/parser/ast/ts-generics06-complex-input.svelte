<script lang="ts" generics="
  T extends {foo: number, bar: string} = {foo: 1, bar: '2'},
  U extends Record<string, T> = Record<string, T>,
  V extends [U,T] = [U,T],
">
    export let array1: T[];
    export let array2: U[];
    export let array3: V[];
</script>

{#each array1 as a}
    {a.foo} {a.bar}
{/each}
{#each array2 as a}
    {a.b.foo} {a.c.bar}
{/each}
{#each array3 as a}
    {a[0].b.foo} {a[1].bar}
{/each}
