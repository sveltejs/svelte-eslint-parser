# svelte-eslint-parser

## 0.25.1

### Patch Changes

- [#309](https://github.com/sveltejs/svelte-eslint-parser/pull/309) [`97a4135`](https://github.com/sveltejs/svelte-eslint-parser/commit/97a4135c3c2fb733a4a33106ec2414c5f37dfd93) Thanks [@ota-meshi](https://github.com/ota-meshi)! - chore: move repo and move url of docs

## 0.25.0

### Minor Changes

- [#296](https://github.com/sveltejs/svelte-eslint-parser/pull/296) [`21d8c1c`](https://github.com/sveltejs/svelte-eslint-parser/commit/21d8c1ccc81e1d456327c1a16925b81044ef051a) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: improved event handler type

## 0.24.2

### Patch Changes

- [#301](https://github.com/sveltejs/svelte-eslint-parser/pull/301) [`ce2deb9`](https://github.com/sveltejs/svelte-eslint-parser/commit/ce2deb9ddc67211fe5c6b67172e1da9d53d082a3) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: wrong typing for typescript v5

## 0.24.1

### Patch Changes

- [#299](https://github.com/sveltejs/svelte-eslint-parser/pull/299) [`472a3bb`](https://github.com/sveltejs/svelte-eslint-parser/commit/472a3bb625adbc451f789b8787e79f771e27fd10) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: wrong scope for reactive block statement

## 0.24.0

### Minor Changes

- [#292](https://github.com/sveltejs/svelte-eslint-parser/pull/292) [`ec061f5`](https://github.com/sveltejs/svelte-eslint-parser/commit/ec061f574d73aa25c13a631bb3be6fa2f861e8e8) Thanks [@ota-meshi](https://github.com/ota-meshi)! - BREAKING: fix resolve to module scope for top level statements

  This change corrects the result of `context.getScope()`, but it is a breaking change.

- [#294](https://github.com/sveltejs/svelte-eslint-parser/pull/294) [`14d6e95`](https://github.com/sveltejs/svelte-eslint-parser/commit/14d6e95773ea638855c25927c11f7a2df1632801) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add peerDependenciesMeta to package.json

- [#295](https://github.com/sveltejs/svelte-eslint-parser/pull/295) [`924cd3e`](https://github.com/sveltejs/svelte-eslint-parser/commit/924cd3e72db0d9d09aed1da5ec3f2e5995c9ca77) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: export name property

## 0.23.0

### Minor Changes

- [#271](https://github.com/sveltejs/svelte-eslint-parser/pull/271) [`e355d5c`](https://github.com/sveltejs/svelte-eslint-parser/commit/e355d5c4d1210ae8b74fd50be6263efc08b849e1) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: wrong variable scope in let directive

## 0.22.4

### Patch Changes

- [#266](https://github.com/sveltejs/svelte-eslint-parser/pull/266) [`d890090`](https://github.com/sveltejs/svelte-eslint-parser/commit/d8900904d99e43acd2cff8f96258bcd1e2e01f29) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: virtual references remained

## 0.22.3

### Patch Changes

- [#262](https://github.com/sveltejs/svelte-eslint-parser/pull/262) [`03971d7`](https://github.com/sveltejs/svelte-eslint-parser/commit/03971d737371a4288e2d08466df469a16d4b03b2) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: parsing errors (or wrong AST) for js comments in template

## 0.22.2

### Patch Changes

- [`e670d44`](https://github.com/sveltejs/svelte-eslint-parser/commit/e670d4406a188c56505205ef84bd9c0819e78d94) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: virtual references remained

## 0.22.1

### Patch Changes

- [#252](https://github.com/sveltejs/svelte-eslint-parser/pull/252) [`fd8adbd`](https://github.com/sveltejs/svelte-eslint-parser/commit/fd8adbd21a4c6a5ed7e9b15e22562d305024f32b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: self-closing style with external source

## 0.22.0

### Minor Changes

- [#249](https://github.com/sveltejs/svelte-eslint-parser/pull/249) [`d560864`](https://github.com/sveltejs/svelte-eslint-parser/commit/d560864681773fb1e795f8f656b3c90c5ca05e5d) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: parsing error when use with member expr

## 0.21.0

### Minor Changes

- [#244](https://github.com/sveltejs/svelte-eslint-parser/pull/244) [`7ebf326`](https://github.com/sveltejs/svelte-eslint-parser/commit/7ebf326c97576bfc721bc133e24c6c643e87e6de) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: `<template lang="...">` to parse as raw text

## 0.20.0

### Minor Changes

- [#241](https://github.com/sveltejs/svelte-eslint-parser/pull/241) [`df83e3e`](https://github.com/sveltejs/svelte-eslint-parser/commit/df83e3e185b2a7436b87c00c781a65c9fb7d07b9) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: support for `typescript-eslint-parser-for-extra-files`

## 0.19.3

### Patch Changes

- [#238](https://github.com/sveltejs/svelte-eslint-parser/pull/238) [`6e063c2`](https://github.com/sveltejs/svelte-eslint-parser/commit/6e063c25ac54f4242025a8fd9bb2d42dd38447dc) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: missing ts node for key of shorthand attribute

## 0.19.2

### Patch Changes

- [#236](https://github.com/sveltejs/svelte-eslint-parser/pull/236) [`82389a3`](https://github.com/sveltejs/svelte-eslint-parser/commit/82389a3840e63b28d3a93bc20d92e36fb658ae57) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: crash in `@typescript-eslint/no-misused-promises` rule

## 0.19.1

### Patch Changes

- [#234](https://github.com/sveltejs/svelte-eslint-parser/pull/234) [`5f237d2`](https://github.com/sveltejs/svelte-eslint-parser/commit/5f237d2015551596d3be36b6cbc4b17fb75f91e6) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: wrong AST and type due to newline after `=` to reactive variable

## 0.19.0

### Minor Changes

- [#230](https://github.com/sveltejs/svelte-eslint-parser/pull/230) [`c67a6c1`](https://github.com/sveltejs/svelte-eslint-parser/commit/c67a6c1ab4f340b9ec206ab737344602e587a2b2) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: change virtual code to provide correct type information for reactive statements

## 0.18.4

### Patch Changes

- [#222](https://github.com/sveltejs/svelte-eslint-parser/pull/222) [`df22f7f`](https://github.com/sveltejs/svelte-eslint-parser/commit/df22f7f11669324f5947ac30dd7fd1560107c556) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: parsing error when `<style lang="scss" global>`

## 0.18.3

### Patch Changes

- [#220](https://github.com/sveltejs/svelte-eslint-parser/pull/220) [`f19019b`](https://github.com/sveltejs/svelte-eslint-parser/commit/f19019b0554750b730279d1f58ef46e8cac34d22) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: parsing error when `<script>` has attribute with empty value

## 0.18.2

### Patch Changes

- [#216](https://github.com/sveltejs/svelte-eslint-parser/pull/216) [`095bf84`](https://github.com/sveltejs/svelte-eslint-parser/commit/095bf84633cc853c74da2c6464bc931cf61553d7) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Fix error in member expr on LHS of reactive statement with TS

## 0.18.1

### Patch Changes

- [#204](https://github.com/sveltejs/svelte-eslint-parser/pull/204) [`cc7dbbd`](https://github.com/sveltejs/svelte-eslint-parser/commit/cc7dbbdac30348864ea7f8a4905667f07de916d3) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: wrong store access type information

- [#207](https://github.com/sveltejs/svelte-eslint-parser/pull/207) [`159c69b`](https://github.com/sveltejs/svelte-eslint-parser/commit/159c69bfa07910e595a1b375db69af26abdab49f) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: support for reactive vars type information
