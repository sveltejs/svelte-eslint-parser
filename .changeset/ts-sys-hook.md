---
"svelte-eslint-parser": minor
---

Add an in-memory `ts.sys.readFile` hook that lets `@typescript-eslint/parser`'s
projectService type-check Svelte files without on-disk artifacts. Activate
with `SVELTE_ESLINT_PARSER_TS_SYS_HOOK=1`. When enabled, the parser
translates each `.svelte` file to virtual TypeScript on demand (memoized by
`(path, mtime)`) and returns it from `ts.sys.readFile`. ESLint's own reads
still see the original Svelte source, the user's `tsconfig.json` is the only
program projectService discovers, and there is no cache directory to manage.

Measured impact (eslint-svelte-ts-perf, 1001 components):

- baseline (`projectService: true`, no hook): ~50s
- with hook, warm runs: ~5–6s

Known limitation: lint rules that surface raw TypeScript diagnostics via
`program.getSemanticDiagnostics()` and friends will report positions in the
virtual TS, not the original Svelte. Type-aware rules that go through
`services.getTypeAtLocation(node)` use the parser's AST positions and are
unaffected.
