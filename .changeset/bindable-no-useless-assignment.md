---
"svelte-eslint-parser": patch
---

fix: mark `$bindable()` props as used, so `no-useless-assignment` does not report writes to them
