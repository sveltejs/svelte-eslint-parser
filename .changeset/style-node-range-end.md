---
"svelte-eslint-parser": patch
---

fix: end `styleNodeRange()` at the end of the style node instead of one character after it, and end `styleNodeLoc()` of the root at the end of the style code
