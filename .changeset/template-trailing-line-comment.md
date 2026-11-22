---
"svelte-eslint-parser": patch
---

fix: parse template expressions that end with a line comment, such as `{value // note` followed by `}` on the next line
