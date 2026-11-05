---
"svelte-eslint-parser": minor
---

Make a Svelte 5 `generics` component a generic type too, so `Foo<Row>` (e.g. in `let instance = $state<Foo<Row>>()`) names its instance with those type arguments instead of failing to resolve; a bare `Foo` keeps working through defaults taken from the constraints.
