---
"svelte-eslint-parser": patch
---

Mark synthetic Svelte references as value references so `@typescript-eslint/no-unused-vars` does not report writable `$bindable` props as type-only.
