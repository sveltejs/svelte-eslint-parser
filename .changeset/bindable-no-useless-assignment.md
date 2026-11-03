---
"svelte-eslint-parser": patch
---

fix: mark `$bindable()` props as used, so `no-useless-assignment` does not report writes to them. Also handle `$props()!`, `$props() as T`, `$props() satisfies T` and `<T>$props()`.
