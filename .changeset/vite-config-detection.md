---
"svelte-eslint-parser": minor
---

Detect the Svelte config from `vite.config.*` for SvelteKit 3. When `parserOptions.svelteConfig` is not set, the parser now statically reads the options of the `sveltekit()` or `svelte()` Vite plugin, and merges them with `svelte.config.js` in the same directory. The `SvelteConfig` type also accepts the SvelteKit 3 flat shape.
