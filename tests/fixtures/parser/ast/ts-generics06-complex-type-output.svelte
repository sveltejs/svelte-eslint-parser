<script lang="ts" generics="
  T extends {foo: number, bar: string} = {foo: 1, bar: '2'}, // T: T, foo: number, bar: string, foo: 1, bar: "2"
  U extends Record<string, T> = Record<string, T>, // U: U, Record: Record<K, T>, T: T, Record: Record<K, T>, T: T
  V extends [U,T] = [U,T], // V: V, U: U, T: T, U: U, T: T
">
    export let array1: T[]; // array1: T[]
    export let array2: U[]; // array2: U[]
    export let array3: V[]; // array3: V[]
</script>

{#each array1 as a} <!-- array1: T[], a: T -->
    {a.foo} {a.bar} <!-- a.foo: number, a.bar: string -->
{/each}
{#each array2 as a} <!-- array2: U[], a: U -->
    {a.b.foo} {a.c.bar} <!-- a.b.foo: number, a.c.bar: string -->
{/each}
{#each array3 as a} <!-- array3: V[], a: V -->
    {a[0].b.foo} {a[1].bar} <!-- a[0].b.foo: number, a[1].bar: string -->
{/each}
