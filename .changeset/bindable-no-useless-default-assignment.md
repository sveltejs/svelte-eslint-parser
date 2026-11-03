---
"svelte-eslint-parser": patch
---

fix: type `$bindable()` props as possibly `undefined` in `$props()`, so `@typescript-eslint/no-useless-default-assignment` does not report them
