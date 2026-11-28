---
"svelte-eslint-parser": minor
---

Type the setter of a function binding on a component (such as `<Select bind:value={() => mode, (v) => (mode = v)}>`) with the getter's return type, as svelte2tsx does, instead of the bound prop's type. A `null` getter still takes the prop's type.
