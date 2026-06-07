---
"svelte-eslint-parser": minor
---

Emit a synthetic component `export default` in the virtual TypeScript for Svelte 5
(runes) components, so files importing a `.svelte` component can resolve its prop
types via `import('svelte').ComponentProps<typeof Component>` (e.g.
`<Foo value={x} />`) and use it with Svelte 5 APIs such as `mount(Foo, …)`.

`Props` is recovered from the runes `$props()` declaration: an explicit type
annotation is used as-is, otherwise prop names, optionality and literal default
types are inferred from the destructuring (`let { value, count = 0 } = $props()`
→ `Component<{ value: any; count?: number }>`). `generics` type parameters are
supported. The synthetic export is removed again in the restore pass, so the
linted file's own AST and scope are unaffected.

Scope: Svelte 5 (runes) only — Svelte 3/4 components emit nothing. This is an
experimental, alpha-stage feature implemented by Claude Code, and only takes
effect together with the experimental `ts.sys.readFile` hook
(`SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`).
