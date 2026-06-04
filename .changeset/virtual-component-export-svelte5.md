---
"svelte-eslint-parser": minor
---

Complete Svelte 5 support for the synthetic component export. The exported value
is now typed as the Svelte 5 `import('svelte').Component<Props>`, so `typeof Foo`
matches modern usage — importers can `mount(Foo, …)` and pass it to Svelte 5 APIs
with correct prop checking (the same-named legacy `SvelteComponent` type alias is
kept so `ComponentEvents<Foo>` still resolves for Svelte 4).

Un-annotated runes `$props()` now also recovers literal default types: `let
{ value, count = 0, name = "x" } = $props()` becomes
`Component<{ value: any; count?: number; name?: string }>` (non-literal defaults
and props without a default stay `any`).

This is an experimental, alpha-stage feature implemented by Claude Code, and only
takes effect together with the experimental `ts.sys.readFile` hook
(`SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`).
