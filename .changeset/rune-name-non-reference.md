---
"svelte-eslint-parser": patch
---

fix: decide on runes mode from the rune references that Svelte counts, so a rune name that is not a reference, a declared rune name, a rune name in a TypeScript type or a store subscription does not turn on runes mode
