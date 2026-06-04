---
"svelte-eslint-parser": patch
---

Confirm that generic components (`<script lang="ts" generics="...">`) expose their
props to importers through `import('svelte').ComponentProps<typeof Component>`.
The parser already declares the generic type parameters in the virtual code
(`type T = unknown`, or the constraint when one is given), so the recovered props
annotation referencing them stays valid; type parameters resolve to their
constraint (or `unknown`) on the importer side. This change only adds test
coverage — no behavior change.

Part of the experimental, alpha-stage component prop-type series implemented by
Claude Code.
