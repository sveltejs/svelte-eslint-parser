---
"svelte-eslint-parser": minor
---

Emit a synthetic component `export default` in the virtual TypeScript so importers of a `.svelte` component can resolve its prop, event, and slot types. The experimental `ts.sys` hook (`SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`) now also resolves `.svelte` import specifiers to that virtual code, so `ComponentProps<typeof Foo>` and `mount(Foo, …)` work across files. The synthetic statements are removed again on restore, so the linted file is unaffected. Experimental, alpha-stage. See the Experimental section in the README for details and limitations.
