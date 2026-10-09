---
"svelte-eslint-parser": minor
---

Keep TypeScript's narrowing of property paths such as `item.list`, and of reassigned variables, inside `{#each}` blocks (e.g. under `{#if item.kind === "a"}`), so they no longer fall back to the unnarrowed type inside the block.
