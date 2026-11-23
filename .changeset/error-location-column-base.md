---
"svelte-eslint-parser": patch
---

fix: report the right line for a parse error at the line break between same-line `<script>` blocks when the parser gives only a 1-based `column`
