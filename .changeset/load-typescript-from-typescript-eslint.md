---
"svelte-eslint-parser": patch
---

fix: load the TypeScript that typescript-eslint uses instead of the newest reachable copy, so a hoisted TypeScript 7 in a pnpm monorepo no longer breaks JS components
