---
"svelte-eslint-parser": minor
---

Select the matching members of a component's discriminated union props by the attributes whose values are fixed in the markup (e.g. `mode="single"`), so other attributes such as `upload={(file) => …}` are typed from that member instead of an unusable union that left callback parameters as implicit `any`.
