---
"svelte-eslint-parser": minor
---

Infer a Svelte 5 generic component's type arguments from the attributes passed to it, so snippet parameters, callback attributes, and function binding setters get the inferred types (e.g. `row` in `<Table rows={users}>{#snippet row(user)}…{/snippet}</Table>` is typed from `users`) instead of the `generics` constraint.
