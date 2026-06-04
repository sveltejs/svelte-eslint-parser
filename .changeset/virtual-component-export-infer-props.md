---
"svelte-eslint-parser": minor
---

Infer a best-effort props type from an un-annotated runes `$props()`
destructuring in the virtual TypeScript, e.g. `let { value, count = 0 } =
$props()` becomes `Component<{ value: any; count?: any }>`. This captures the
prop names and which are required (a default value makes a prop optional), so
importers catch missing required props and unknown props even though the value
types stay `any` (annotate `$props()` for precise types). Patterns with a rest
element or computed keys fall back to a permissive type.

This is an experimental, alpha-stage feature implemented by Claude Code. It
currently only takes effect together with the experimental `ts.sys.readFile` hook
(`SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`).
