---
"svelte-eslint-parser": minor
---

Treat a binding to a variable (such as `bind:this={el}` or `bind:value={text}`) as a write of it for type checking, so TypeScript no longer keeps the variable narrowed to its initial value (e.g. `null`) inside closures, and type the setter of a `bind:this` function binding with the element or component instance type instead of implicit `any`.
