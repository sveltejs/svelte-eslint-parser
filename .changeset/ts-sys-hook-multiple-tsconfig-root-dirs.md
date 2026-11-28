---
"svelte-eslint-parser": patch
---

fix: translate imported components under the ts.sys hook when several `eslint.config.js` files registered tsconfigRootDir candidates, instead of falling back to the ambient `*.svelte` module
