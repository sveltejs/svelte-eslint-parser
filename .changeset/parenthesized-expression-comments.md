---
"svelte-eslint-parser": patch
---

fix: keep comments around a template expression that Svelte does not attach to it, such as `/* a */` in `{/* a */ (value)}` and `/* b */` in `{fn(value) /* b */}`, and parse `{(/* a */ (value)) /* b */}`
