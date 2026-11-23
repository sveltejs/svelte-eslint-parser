---
"svelte-eslint-parser": patch
---

fix: do not narrow Svelte v4 `export let` props to the type of their default value (e.g. no more false positives from `@typescript-eslint/no-unnecessary-condition` for `href ?? fallback`)
