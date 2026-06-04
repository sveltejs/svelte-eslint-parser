---
"svelte-eslint-parser": minor
---

Use a legacy `$$Props` interface or type alias as the component prop types in the
virtual TypeScript when present, taking priority over `export let` inference (as
in svelte2tsx). This lets importers of a `.svelte` component that types its props
with `$$Props` resolve them via `import('svelte').ComponentProps<typeof Component>`.

This is an experimental, alpha-stage feature implemented by Claude Code, and a
follow-up to the runes `$props()` and legacy `export let` support. It currently
only takes effect together with the experimental `ts.sys.readFile` hook
(`SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`).
