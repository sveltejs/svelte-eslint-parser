---
"svelte-eslint-parser": minor
---

Add an experimental `ts.sys.readFile` hook for type-aware Svelte lint.
Activate with `SVELTE_ESLINT_PARSER_TS_SYS_HOOK=1`; TypeScript reads each
`.svelte` file as virtual TypeScript on demand, no cache directory or CLI
sync required. See the Experimental section in the README.
