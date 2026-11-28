---
"svelte-eslint-parser": patch
---

fix: detect a parser that wraps `@typescript-eslint/parser` on Windows when the cwd has no drive letter, such as a UNC path
