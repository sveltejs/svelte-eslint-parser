---
"svelte-eslint-parser": patch
---

fix: remove leftover scope references from the type of `use:` directive parameters, which crashed some rules (e.g. `sonarjs/no-unused-collection`) with `lang="ts"`
