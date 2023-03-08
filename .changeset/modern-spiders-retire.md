---
"svelte-eslint-parser": minor
---

BREAKING: fix resolve to module scope for top level statements

This change corrects the result of `context.getScope()`, but it is a breaking change.
