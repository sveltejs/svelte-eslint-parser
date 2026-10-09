---
"svelte-eslint-parser": minor
---

Keep TypeScript's narrowing of property paths such as `item.list` inside `{#each}` blocks (e.g. under `{#if item.kind === "a"}`), so they no longer fall back to the unnarrowed union inside the block.
