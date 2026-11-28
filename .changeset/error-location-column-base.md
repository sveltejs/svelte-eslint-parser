---
"svelte-eslint-parser": patch
---

fix: report the right location for a parse error from a parser that gives only `lineNumber` and a 1-based `column` when `<script>` blocks are on the same line
