---
"svelte-eslint-parser": minor
---

Emit a synthetic Svelte 5 component `export default` in the virtual TypeScript so
importers of a `.svelte` component resolve its props via
`import('svelte').ComponentProps<typeof Component>` and can use it with APIs like
`mount(Foo, …)`. Props come from the runes `$props()` declaration (annotation /
`as` / `satisfies` used as-is; otherwise required props are `any` and defaulted
props are typed by inferring their default via `typeof`). Removed again in the
restore pass, so the linted file is unaffected.

Svelte 5 (runes) only; experimental, alpha-stage, behind
`SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`.
