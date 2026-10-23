---
"svelte-eslint-parser": patch
---

Type a `{#snippet}` call as a `Snippet` call instead of `void`, so `@typescript-eslint/no-confusing-void-expression` no longer reports `{@render name()}`.
