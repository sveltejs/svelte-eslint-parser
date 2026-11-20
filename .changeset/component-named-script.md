---
"svelte-eslint-parser": patch
---

fix: do not treat components named `Script`, `Style` or `Template` as blocks, and match closing tags such as `</script>` case-sensitively like Svelte
