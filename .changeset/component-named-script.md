---
"svelte-eslint-parser": patch
---

fix: match `<script>`, `<style>` and `<template>` tags case-sensitively like Svelte, so a component named `Script`, `Style` or `Template` is not parsed as a block
