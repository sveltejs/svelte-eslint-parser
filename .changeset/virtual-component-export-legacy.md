---
"svelte-eslint-parser": minor
---

Synthesize the component prop types from legacy `export let` declarations in the
virtual TypeScript, so importers of a legacy `.svelte` component resolve its
props via `import('svelte').ComponentProps<typeof Component>`. A default value
makes the prop optional and an explicit annotation is used as-is, mirroring
svelte2tsx (e.g. `export let value: string; export let count = 0;` becomes
`Component<{ value: string; count?: typeof count }>`).

This is an experimental, alpha-stage feature implemented by Claude Code, and a
follow-up to the runes `$props()` support. It currently only takes effect together
with the experimental `ts.sys.readFile` hook
(`SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`).
