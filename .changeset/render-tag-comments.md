---
"svelte-eslint-parser": patch
---

fix: keep comments in `{@render}` tags, such as `/* a */` in `{@render foo() /* a */}`, as comments
