---
"svelte-eslint-parser": minor
---

Include instance exports (`export const`, `export function`, `export class`, and `export { … }` in the instance script) in the synthetic component type, so a component instance obtained through `bind:this` exposes them with their real types instead of `any`.
