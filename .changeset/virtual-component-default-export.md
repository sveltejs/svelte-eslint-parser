---
"svelte-eslint-parser": minor
---

Emit a synthetic component `export default` in the virtual TypeScript so that
files importing a `.svelte` component can resolve its prop types via
`import('svelte').ComponentProps<typeof Component>` (e.g. `<Foo value={x} />`).

This is an experimental, alpha-stage feature implemented by Claude Code. Only the
runes `$props()` type annotation is recognized for now; legacy `export let`,
`$$Props`, generics, events and slots are handled in follow-up work. It currently
only takes effect together with the experimental `ts.sys.readFile` hook
(`SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`).
