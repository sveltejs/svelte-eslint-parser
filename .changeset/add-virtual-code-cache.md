---
"svelte-eslint-parser": minor
---

Add experimental `svelteFeatures.experimentalGenerateVirtualCodeCache` parser option that speeds up type-aware linting of Svelte projects by an order of magnitude.

When enabled, the parser pre-generates virtual `.ts` shims for every `.svelte` file in the project (into a `.svelte-eslint-parser/` cache directory) and points `typescript-eslint` at those cached files, so TypeScript's projectService can reuse one program across every file instead of re-resolving on each parse. Cached files are keyed by content hash + mtime, so unchanged files are skipped on later runs.

```js
languageOptions: {
  parser: svelteParser,
  parserOptions: {
    parser: ts.parser,
    projectService: true,
    extraFileExtensions: [".svelte"],
    tsconfigRootDir: import.meta.dirname,
    svelteFeatures: {
      experimentalGenerateVirtualCodeCache: true,
    },
  },
},
```

Add `.svelte-eslint-parser/` to your `.gitignore`. The option is opt-in (defaults to `false`); existing users are unaffected.
