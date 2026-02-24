# svelte-eslint-parser

## 1.5.1

### Patch Changes

- [#842](https://github.com/sveltejs/svelte-eslint-parser/pull/842) [`df12f13`](https://github.com/sveltejs/svelte-eslint-parser/commit/df12f135ad0c474dc61afa78c72d6caddaa478f3) Thanks [@DMartens](https://github.com/DMartens)! - fix: move semver dependency from dev to production dependency

## 1.5.0

### Minor Changes

- [#836](https://github.com/sveltejs/svelte-eslint-parser/pull/836) [`9927649`](https://github.com/sveltejs/svelte-eslint-parser/commit/9927649cc60acaaf4b48029d0a424a72ce5b1f73) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: improve compatibility with ESLint v10

## 1.4.1

### Patch Changes

- [#801](https://github.com/sveltejs/svelte-eslint-parser/pull/801) [`e1b92c0`](https://github.com/sveltejs/svelte-eslint-parser/commit/e1b92c0b68234fc7a500ce65a700e2c889cc3db1) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: Support `name_loc` property

## 1.4.0

### Minor Changes

- [#774](https://github.com/sveltejs/svelte-eslint-parser/pull/774) [`cafbfdf`](https://github.com/sveltejs/svelte-eslint-parser/commit/cafbfdf418988393ccdce4ec29477c2764e17c09) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: add `$state.eager`

## 1.3.3

### Patch Changes

- [#762](https://github.com/sveltejs/svelte-eslint-parser/pull/762) [`6b9cc59`](https://github.com/sveltejs/svelte-eslint-parser/commit/6b9cc5924eefc3609f05b496233391fff5c930b7) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: show proper parse error position

## 1.3.2

### Patch Changes

- [#747](https://github.com/sveltejs/svelte-eslint-parser/pull/747) [`eddc3e3`](https://github.com/sveltejs/svelte-eslint-parser/commit/eddc3e39937bc33693096fe56abf3421d36a8181) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: internal function hasTypeInfo misjudging and providing insufficient type information in complex cases.

## 1.3.1

### Patch Changes

- [#732](https://github.com/sveltejs/svelte-eslint-parser/pull/732) [`1350734`](https://github.com/sveltejs/svelte-eslint-parser/commit/1350734793ad8cf86b660aa8e3337be3c48fb5d4) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: `$derived` argument expression to apply correct type information to `this`

## 1.3.0

### Minor Changes

- [#725](https://github.com/sveltejs/svelte-eslint-parser/pull/725) [`1710145`](https://github.com/sveltejs/svelte-eslint-parser/commit/1710145c2e9f3d87103276e8a8517997833aae6b) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: support asynchronous svelte

## 1.2.0

### Minor Changes

- [#714](https://github.com/sveltejs/svelte-eslint-parser/pull/714) [`855af3b`](https://github.com/sveltejs/svelte-eslint-parser/commit/855af3b9fe4dc94d0af025b0b443579fa6e2c507) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: support `{@attach ...}`

## 1.1.3

### Patch Changes

- [#704](https://github.com/sveltejs/svelte-eslint-parser/pull/704) [`0436da6`](https://github.com/sveltejs/svelte-eslint-parser/commit/0436da6b7190208284de45ce7a54e18c4d31c032) Thanks [@mcous](https://github.com/mcous)! - Strip `projectService` from TS options when type information not needed

## 1.1.2

### Patch Changes

- [#698](https://github.com/sveltejs/svelte-eslint-parser/pull/698) [`8188302`](https://github.com/sveltejs/svelte-eslint-parser/commit/81883020381ddef27490ddc27ea719135abee89e) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: crash with `$derived()` in template using ts

## 1.1.1

### Patch Changes

- [#692](https://github.com/sveltejs/svelte-eslint-parser/pull/692) [`1c533d8`](https://github.com/sveltejs/svelte-eslint-parser/commit/1c533d8929c57f3bba5e97bc4d1aee06ddd9cdd0) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: resolved issue of `$props` incorrectly detected as store when using variables named after runes like `$props` and `props`

## 1.1.0

### Minor Changes

- [#686](https://github.com/sveltejs/svelte-eslint-parser/pull/686) [`f26ee51`](https://github.com/sveltejs/svelte-eslint-parser/commit/f26ee51709e286713acb3b2c223c5d807c72fecb) Thanks [@marekdedic](https://github.com/marekdedic)! - style Context parsing error type fix

## 1.0.1

### Patch Changes

- [#681](https://github.com/sveltejs/svelte-eslint-parser/pull/681) [`edb63e2`](https://github.com/sveltejs/svelte-eslint-parser/commit/edb63e213fae5e72604d45841b357f158d16fd3b) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: align required Node version with ESLint

## 1.0.0

### Major Changes

- [#579](https://github.com/sveltejs/svelte-eslint-parser/pull/579) [`4ac8236`](https://github.com/sveltejs/svelte-eslint-parser/commit/4ac82369156bb081d131d3fb1bf4f488a16f509a) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat!: drop support for old node versions (<18, 19, 21)

- [#599](https://github.com/sveltejs/svelte-eslint-parser/pull/599) [`cefd17a`](https://github.com/sveltejs/svelte-eslint-parser/commit/cefd17a17d2e0318a4c982f5958f21307024bc95) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat!: change the parser to an ESM-only package

- [#459](https://github.com/sveltejs/svelte-eslint-parser/pull/459) [`d768a5c`](https://github.com/sveltejs/svelte-eslint-parser/commit/d768a5ce13d15e00fa82434c041366c00d2833b0) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update dependency eslint-scope to v8

### Minor Changes

- [#645](https://github.com/sveltejs/svelte-eslint-parser/pull/645) [`6ff7516`](https://github.com/sveltejs/svelte-eslint-parser/commit/6ff75160975fa91f31737e5fbb5244505624eeca) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: improve scoping of snippet declarations acting as slot properties

- [#609](https://github.com/sveltejs/svelte-eslint-parser/pull/609) [`47b61de`](https://github.com/sveltejs/svelte-eslint-parser/commit/47b61deb4eaf668eb07ef0697e11ae46a7790639) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for `<svelte:boundary>`

- [#641](https://github.com/sveltejs/svelte-eslint-parser/pull/641) [`89e053a`](https://github.com/sveltejs/svelte-eslint-parser/commit/89e053a28d81a0c19a19998befc9dcc4b5f08b3a) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: replace `declaration` property of SvelteConstTag with `declarations` property

- [#589](https://github.com/sveltejs/svelte-eslint-parser/pull/589) [`f54c91f`](https://github.com/sveltejs/svelte-eslint-parser/commit/f54c91f2dac9b27681d9ea9811d25ff8afe5aafe) Thanks [@marekdedic](https://github.com/marekdedic)! - feat: stabilized generics

- [#647](https://github.com/sveltejs/svelte-eslint-parser/pull/647) [`10ffeec`](https://github.com/sveltejs/svelte-eslint-parser/commit/10ffeecf99b1e98568460a96b298dbbadfb87336) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add AST node for function bindings

- [#626](https://github.com/sveltejs/svelte-eslint-parser/pull/626) [`cde2baf`](https://github.com/sveltejs/svelte-eslint-parser/commit/cde2baf38ee3d87c6bf4628b4f9d9b06cbabfd8e) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: Add `warningFilter` to `SvelteConfig`

- [#673](https://github.com/sveltejs/svelte-eslint-parser/pull/673) [`cab2fd2`](https://github.com/sveltejs/svelte-eslint-parser/commit/cab2fd2f9b10a3224ad0805bd9d4805db651ab2d) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: support latest runes (`$props.id` and `$inspect.trace`)

- [#619](https://github.com/sveltejs/svelte-eslint-parser/pull/619) [`002e3b0`](https://github.com/sveltejs/svelte-eslint-parser/commit/002e3b0cc5174be56adc0fc0aa16f0d1826864ac) Thanks [@marekdedic](https://github.com/marekdedic)! - feat: added support for style selector parsing

- [#617](https://github.com/sveltejs/svelte-eslint-parser/pull/617) [`1e0b874`](https://github.com/sveltejs/svelte-eslint-parser/commit/1e0b8743f9a687d4e4089a2b9ab7407c86b22453) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support `{#each}` without `as` (svelte v5.4.0)

### Patch Changes

- [#633](https://github.com/sveltejs/svelte-eslint-parser/pull/633) [`1178032`](https://github.com/sveltejs/svelte-eslint-parser/commit/1178032e298fd09cff47aedbc140327e1f1cd912) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: assign actual `runes` value to `SvelteParseContext`

- [#636](https://github.com/sveltejs/svelte-eslint-parser/pull/636) [`78f2923`](https://github.com/sveltejs/svelte-eslint-parser/commit/78f2923e86c56000f0d064fa180730b1c63dfd80) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: correct detection of runes mode in parsed files

- [#638](https://github.com/sveltejs/svelte-eslint-parser/pull/638) [`df461c3`](https://github.com/sveltejs/svelte-eslint-parser/commit/df461c3019b5b964a83c45fc16888fe8b706a3a1) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: resolve issues in Runes mode detection causing parser malfunctions

- [#650](https://github.com/sveltejs/svelte-eslint-parser/pull/650) [`bc75922`](https://github.com/sveltejs/svelte-eslint-parser/commit/bc759223c158273dad7832419466b24a91a45957) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: add `parent` node to `SvelteFunctionBindingsExpression`

- [#601](https://github.com/sveltejs/svelte-eslint-parser/pull/601) [`e1c6a8a`](https://github.com/sveltejs/svelte-eslint-parser/commit/e1c6a8ac3585d2c4a0dede3f0d5eb0f511045ea9) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: remove experimental for svelteFeatures.runes option parserOptions

- [#612](https://github.com/sveltejs/svelte-eslint-parser/pull/612) [`9e84b3e`](https://github.com/sveltejs/svelte-eslint-parser/commit/9e84b3e7ab44e737a7f54010daeb9739d9214019) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: compatibility with eslint-plugin-prettier

- [#604](https://github.com/sveltejs/svelte-eslint-parser/pull/604) [`5ed0609`](https://github.com/sveltejs/svelte-eslint-parser/commit/5ed060950b7db8ee1d04a8106238fcad0ed02aad) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: recognize script as module for Typescript type checking

- [#630](https://github.com/sveltejs/svelte-eslint-parser/pull/630) [`8b179dd`](https://github.com/sveltejs/svelte-eslint-parser/commit/8b179ddb5e25665f66e710c8ded4cd0fd033b84b) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: prevent errors when `<script>` tags are used inside `{@html}`

- [#600](https://github.com/sveltejs/svelte-eslint-parser/pull/600) [`5586809`](https://github.com/sveltejs/svelte-eslint-parser/commit/5586809d9988323926d53b5999494a56c6442df0) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: support postcss

## 1.0.0-next.13

### Minor Changes

- [#645](https://github.com/sveltejs/svelte-eslint-parser/pull/645) [`6ff7516`](https://github.com/sveltejs/svelte-eslint-parser/commit/6ff75160975fa91f31737e5fbb5244505624eeca) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: improve scoping of snippet declarations acting as slot properties

### Patch Changes

- [#650](https://github.com/sveltejs/svelte-eslint-parser/pull/650) [`bc75922`](https://github.com/sveltejs/svelte-eslint-parser/commit/bc759223c158273dad7832419466b24a91a45957) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: add `parent` node to `SvelteFunctionBindingsExpression`

## 1.0.0-next.12

### Minor Changes

- [#647](https://github.com/sveltejs/svelte-eslint-parser/pull/647) [`10ffeec`](https://github.com/sveltejs/svelte-eslint-parser/commit/10ffeecf99b1e98568460a96b298dbbadfb87336) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add AST node for function bindings

## 1.0.0-next.11

### Minor Changes

- [#641](https://github.com/sveltejs/svelte-eslint-parser/pull/641) [`89e053a`](https://github.com/sveltejs/svelte-eslint-parser/commit/89e053a28d81a0c19a19998befc9dcc4b5f08b3a) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: replace `declaration` property of SvelteConstTag with `declarations` property

## 1.0.0-next.10

### Patch Changes

- [#638](https://github.com/sveltejs/svelte-eslint-parser/pull/638) [`df461c3`](https://github.com/sveltejs/svelte-eslint-parser/commit/df461c3019b5b964a83c45fc16888fe8b706a3a1) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: resolve issues in Runes mode detection causing parser malfunctions

## 1.0.0-next.9

### Patch Changes

- [#636](https://github.com/sveltejs/svelte-eslint-parser/pull/636) [`78f2923`](https://github.com/sveltejs/svelte-eslint-parser/commit/78f2923e86c56000f0d064fa180730b1c63dfd80) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: correct detection of runes mode in parsed files

## 1.0.0-next.8

### Patch Changes

- [#630](https://github.com/sveltejs/svelte-eslint-parser/pull/630) [`8b179dd`](https://github.com/sveltejs/svelte-eslint-parser/commit/8b179ddb5e25665f66e710c8ded4cd0fd033b84b) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: prevent errors when `<script>` tags are used inside `{@html}`

## 1.0.0-next.7

### Patch Changes

- [#633](https://github.com/sveltejs/svelte-eslint-parser/pull/633) [`1178032`](https://github.com/sveltejs/svelte-eslint-parser/commit/1178032e298fd09cff47aedbc140327e1f1cd912) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: assign actual `runes` value to `SvelteParseContext`

## 1.0.0-next.6

### Minor Changes

- [#626](https://github.com/sveltejs/svelte-eslint-parser/pull/626) [`cde2baf`](https://github.com/sveltejs/svelte-eslint-parser/commit/cde2baf38ee3d87c6bf4628b4f9d9b06cbabfd8e) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: Add `warningFilter` to `SvelteConfig`

## 1.0.0-next.5

### Minor Changes

- [#619](https://github.com/sveltejs/svelte-eslint-parser/pull/619) [`002e3b0`](https://github.com/sveltejs/svelte-eslint-parser/commit/002e3b0cc5174be56adc0fc0aa16f0d1826864ac) Thanks [@marekdedic](https://github.com/marekdedic)! - feat: added support for style selector parsing

## 1.0.0-next.4

### Minor Changes

- [#617](https://github.com/sveltejs/svelte-eslint-parser/pull/617) [`1e0b874`](https://github.com/sveltejs/svelte-eslint-parser/commit/1e0b8743f9a687d4e4089a2b9ab7407c86b22453) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support `{#each}` without `as` (svelte v5.4.0)

## 1.0.0-next.3

### Patch Changes

- [#612](https://github.com/sveltejs/svelte-eslint-parser/pull/612) [`9e84b3e`](https://github.com/sveltejs/svelte-eslint-parser/commit/9e84b3e7ab44e737a7f54010daeb9739d9214019) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: compatibility with eslint-plugin-prettier

## 1.0.0-next.2

### Major Changes

- [#599](https://github.com/sveltejs/svelte-eslint-parser/pull/599) [`cefd17a`](https://github.com/sveltejs/svelte-eslint-parser/commit/cefd17a17d2e0318a4c982f5958f21307024bc95) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat!: change the parser to an ESM-only package

## 1.0.0-next.1

### Major Changes

- [#459](https://github.com/sveltejs/svelte-eslint-parser/pull/459) [`d768a5c`](https://github.com/sveltejs/svelte-eslint-parser/commit/d768a5ce13d15e00fa82434c041366c00d2833b0) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update dependency eslint-scope to v8

### Minor Changes

- [#609](https://github.com/sveltejs/svelte-eslint-parser/pull/609) [`47b61de`](https://github.com/sveltejs/svelte-eslint-parser/commit/47b61deb4eaf668eb07ef0697e11ae46a7790639) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for `<svelte:boundary>`

### Patch Changes

- [#601](https://github.com/sveltejs/svelte-eslint-parser/pull/601) [`e1c6a8a`](https://github.com/sveltejs/svelte-eslint-parser/commit/e1c6a8ac3585d2c4a0dede3f0d5eb0f511045ea9) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: remove experimental for svelteFeatures.runes option parserOptions

- [#604](https://github.com/sveltejs/svelte-eslint-parser/pull/604) [`5ed0609`](https://github.com/sveltejs/svelte-eslint-parser/commit/5ed060950b7db8ee1d04a8106238fcad0ed02aad) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: recognize script as module for Typescript type checking

- [#600](https://github.com/sveltejs/svelte-eslint-parser/pull/600) [`5586809`](https://github.com/sveltejs/svelte-eslint-parser/commit/5586809d9988323926d53b5999494a56c6442df0) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: support postcss

## 1.0.0-next.0

### Major Changes

- [#579](https://github.com/sveltejs/svelte-eslint-parser/pull/579) [`4ac8236`](https://github.com/sveltejs/svelte-eslint-parser/commit/4ac82369156bb081d131d3fb1bf4f488a16f509a) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat!: drop support for old node versions (<18, 19, 21)

### Minor Changes

- [#589](https://github.com/sveltejs/svelte-eslint-parser/pull/589) [`f54c91f`](https://github.com/sveltejs/svelte-eslint-parser/commit/f54c91f2dac9b27681d9ea9811d25ff8afe5aafe) Thanks [@marekdedic](https://github.com/marekdedic)! - feat: stabilized generics

## 0.43.0

### Minor Changes

- [#576](https://github.com/sveltejs/svelte-eslint-parser/pull/576) [`88548e9`](https://github.com/sveltejs/svelte-eslint-parser/commit/88548e96879912daf5d541575f944b95031f1151) Thanks [@ota-meshi](https://github.com/ota-meshi)! - update svelte to v5

### Patch Changes

- [#576](https://github.com/sveltejs/svelte-eslint-parser/pull/576) [`88548e9`](https://github.com/sveltejs/svelte-eslint-parser/commit/88548e96879912daf5d541575f944b95031f1151) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix some `$props()` type linting error

## 0.42.0

### Minor Changes

- [#569](https://github.com/sveltejs/svelte-eslint-parser/pull/569) [`3119299`](https://github.com/sveltejs/svelte-eslint-parser/commit/3119299bb66291f537b9c28bb89a559fb6cae90b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: improve props type

### Patch Changes

- [#573](https://github.com/sveltejs/svelte-eslint-parser/pull/573) [`7c556ca`](https://github.com/sveltejs/svelte-eslint-parser/commit/7c556ca092930518c3794bff7be59ed68c2eb15c) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: error in snippets with type annotations

## 0.41.1

### Patch Changes

- [#561](https://github.com/sveltejs/svelte-eslint-parser/pull/561) [`8350bb5`](https://github.com/sveltejs/svelte-eslint-parser/commit/8350bb5b59bc6b54afa72baf7eccb83929ceb593) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: incorrect runes inference when having empty compiler options

## 0.41.0

### Minor Changes

- [#550](https://github.com/sveltejs/svelte-eslint-parser/pull/550) [`ef24a69`](https://github.com/sveltejs/svelte-eslint-parser/commit/ef24a69b805b7cff6744be4cbdbc9c2349cfe04d) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: support for svelte 5.0.0-next.191

## 0.40.0

### Minor Changes

- [#548](https://github.com/sveltejs/svelte-eslint-parser/pull/548) [`dfe5cb8`](https://github.com/sveltejs/svelte-eslint-parser/commit/dfe5cb815ef2119cfa56ade8755c45b8533c24e1) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: update svelte to 5.0.0-next.181 and fix for `{:else if}`

## 0.39.2

### Patch Changes

- [#540](https://github.com/sveltejs/svelte-eslint-parser/pull/540) [`48a7001`](https://github.com/sveltejs/svelte-eslint-parser/commit/48a7001d961ff82b6546b6b8c4e6e4655cc5c374) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: parsing error for nesting `{#snippet}`

## 0.39.1

### Patch Changes

- [#538](https://github.com/sveltejs/svelte-eslint-parser/pull/538) [`437e463`](https://github.com/sveltejs/svelte-eslint-parser/commit/437e4639d771ab55eaaca023f25cafecd94750a8) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: Set `svelteFeatures.runes` to `true` by default for Svelte 5

## 0.39.0

### Minor Changes

- [#536](https://github.com/sveltejs/svelte-eslint-parser/pull/536) [`1a9ef3d`](https://github.com/sveltejs/svelte-eslint-parser/commit/1a9ef3d5fda174077c3504de32c1123883d4bde4) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: makes it optional whether to parse runes.

## 0.38.0

### Minor Changes

- [#534](https://github.com/sveltejs/svelte-eslint-parser/pull/534) [`a27c8e9`](https://github.com/sveltejs/svelte-eslint-parser/commit/a27c8e902d5db63eadc0c8fd7c63e9e09b25845d) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: support Svelte 5.0.0-next.155. (Add `$state.is` and replace `$effect.active` with `$effect.tracking`)

## 0.37.0

### Minor Changes

- [#527](https://github.com/sveltejs/svelte-eslint-parser/pull/527) [`d92287d`](https://github.com/sveltejs/svelte-eslint-parser/commit/d92287d35074f9293bba9db28d43ead997d3ea06) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for `$bindable()` scope analysis

## 0.36.0

### Minor Changes

- [#513](https://github.com/sveltejs/svelte-eslint-parser/pull/513) [`37f0061`](https://github.com/sveltejs/svelte-eslint-parser/commit/37f006191342d2f4bfa44a8798b40b6079d9b75f) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for $host and $state.snapshot

- [#513](https://github.com/sveltejs/svelte-eslint-parser/pull/513) [`37f0061`](https://github.com/sveltejs/svelte-eslint-parser/commit/37f006191342d2f4bfa44a8798b40b6079d9b75f) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: update svelte to 5.0.0-next.115 && minor refactor

## 0.35.0

### Minor Changes

- [#510](https://github.com/sveltejs/svelte-eslint-parser/pull/510) [`9dddc36`](https://github.com/sveltejs/svelte-eslint-parser/commit/9dddc36ec7bd5ef9549e8f324539c5e0e5789b86) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: update type of $props rune

## 0.34.1

### Patch Changes

- [#504](https://github.com/sveltejs/svelte-eslint-parser/pull/504) [`44c1704`](https://github.com/sveltejs/svelte-eslint-parser/commit/44c170430151aaa1bc9ef86d6f8e0868585074d5) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: wrong token when using `lang=ts`

## 0.34.0

### Minor Changes

#### Add experimental support for Svelte v5

- [#421](https://github.com/sveltejs/svelte-eslint-parser/pull/421) [`59fc0e9`](https://github.com/sveltejs/svelte-eslint-parser/commit/59fc0e90bdd20f208a4ae8c3527ea51acf106811) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: (experimental) partial support for Svelte v5 parser
- [#425](https://github.com/sveltejs/svelte-eslint-parser/pull/425) [`ff242c4`](https://github.com/sveltejs/svelte-eslint-parser/commit/ff242c4abc322fd6bc93fda9fb30da14d73a847e) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: Support runes
- [#426](https://github.com/sveltejs/svelte-eslint-parser/pull/426) [`9793cb0`](https://github.com/sveltejs/svelte-eslint-parser/commit/9793cb0d4520b1d5ae9e1f0aa5aff1c8b84cebb6) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: apply runes to `*.svelte.js` and `*.svelte.ts`.
- [#430](https://github.com/sveltejs/svelte-eslint-parser/pull/430) [`af1bae5`](https://github.com/sveltejs/svelte-eslint-parser/commit/af1bae5d4eb9c9605e4f2ad66590b14f1bfa9a55) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: apply correct type information to `$derived` argument expression
- [#498](https://github.com/sveltejs/svelte-eslint-parser/pull/498) [`3b2c62b`](https://github.com/sveltejs/svelte-eslint-parser/commit/3b2c62b2bafa22ec1251968c5969a7006ae61fb9) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for `$bindable` rune
- [#440](https://github.com/sveltejs/svelte-eslint-parser/pull/440) [`726f21f`](https://github.com/sveltejs/svelte-eslint-parser/commit/726f21fc7a520abe8b7b0be268f2ceb9b3205531) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: skip type injection if template uses TypeScript
- [#431](https://github.com/sveltejs/svelte-eslint-parser/pull/431) [`ab13a46`](https://github.com/sveltejs/svelte-eslint-parser/commit/ab13a4662410014ad7d53fc7664bd5b464f15cbe) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for `{#snippet}` and `{@render}`
- [#437](https://github.com/sveltejs/svelte-eslint-parser/pull/437) [`a27697a`](https://github.com/sveltejs/svelte-eslint-parser/commit/a27697a715072ae6adddf228976f23bab6d48fb8) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: change it to use modern AST, if svelte v5 is installed
- [#441](https://github.com/sveltejs/svelte-eslint-parser/pull/441) [`34232c5`](https://github.com/sveltejs/svelte-eslint-parser/commit/34232c58b49abdb362d74d849e80ef5607d0ce52) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: add type of `$effect.active`
- [#479](https://github.com/sveltejs/svelte-eslint-parser/pull/479) [`850ad74`](https://github.com/sveltejs/svelte-eslint-parser/commit/850ad74176416978e360f6c23e4479bff81baea6) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for `$derived.by` type
- [#477](https://github.com/sveltejs/svelte-eslint-parser/pull/477) [`5f2b111`](https://github.com/sveltejs/svelte-eslint-parser/commit/5f2b1112e1ceacfabb292e51d33492fba878bc6c) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add experimental support for generics directive
- [#446](https://github.com/sveltejs/svelte-eslint-parser/pull/446) [`168f920`](https://github.com/sveltejs/svelte-eslint-parser/commit/168f9209e8ea9f2a1ef2fad28728f6aa0963638f) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for `$inspect` and `$effect.root`
- [#435](https://github.com/sveltejs/svelte-eslint-parser/pull/435) [`7508680`](https://github.com/sveltejs/svelte-eslint-parser/commit/7508680b3a88c951fa3fe0bdd9b59b21d6034b27) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: improve props type
- [#476](https://github.com/sveltejs/svelte-eslint-parser/pull/476) [`92aeee3`](https://github.com/sveltejs/svelte-eslint-parser/commit/92aeee35ee7bcfd27d8bc1920a341ddf14fa926b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: change AST of `{@render}` and `{#snippet}` to match the latest version of svelte v5.
- [#483](https://github.com/sveltejs/svelte-eslint-parser/pull/483) [`f722d7c`](https://github.com/sveltejs/svelte-eslint-parser/commit/f722d7c047706b4a051999b28d482d0069667da5) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: for svelte v5.0.0-next.68 & support optional `{@render}`
- [#434](https://github.com/sveltejs/svelte-eslint-parser/pull/434) [`0ef067b`](https://github.com/sveltejs/svelte-eslint-parser/commit/0ef067b57ab8897cff03f8793c2767e6d0b83274) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: incorrect location when there is whitespace at the beginning of block
- [#486](https://github.com/sveltejs/svelte-eslint-parser/pull/486) [`79a4fb7`](https://github.com/sveltejs/svelte-eslint-parser/commit/79a4fb718673e5af74075e0575b74b87ef2c406a) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: wrong scope in top level snippets
- [#467](https://github.com/sveltejs/svelte-eslint-parser/pull/467) [`e27a3de`](https://github.com/sveltejs/svelte-eslint-parser/commit/e27a3de8d97dd934a8dc0097374eee3ad3ee61ff) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: update `$inspect` types
- [#466](https://github.com/sveltejs/svelte-eslint-parser/pull/466) [`d5b3322`](https://github.com/sveltejs/svelte-eslint-parser/commit/d5b3322e19b7208815ba4251d75cf46d511cd4f1) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: add `$state.frozen` support
- [#438](https://github.com/sveltejs/svelte-eslint-parser/pull/438) [`c21b54c`](https://github.com/sveltejs/svelte-eslint-parser/commit/c21b54ced7984aaeaac6b12ff66bfc4cc0712caf) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: incorrect location for `{ #await expr then v }` with spaces

## 0.34.0-next.12

### Patch Changes

- [#486](https://github.com/sveltejs/svelte-eslint-parser/pull/486) [`79a4fb7`](https://github.com/sveltejs/svelte-eslint-parser/commit/79a4fb718673e5af74075e0575b74b87ef2c406a) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: wrong scope in top level snippets

## 0.34.0-next.11

### Minor Changes

- [#437](https://github.com/sveltejs/svelte-eslint-parser/pull/437) [`a27697a`](https://github.com/sveltejs/svelte-eslint-parser/commit/a27697a715072ae6adddf228976f23bab6d48fb8) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: change it to use modern AST, if svelte v5 is installed

- [#477](https://github.com/sveltejs/svelte-eslint-parser/pull/477) [`5f2b111`](https://github.com/sveltejs/svelte-eslint-parser/commit/5f2b1112e1ceacfabb292e51d33492fba878bc6c) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add experimental support for generics directive

## 0.34.0-next.10

### Minor Changes

- [#479](https://github.com/sveltejs/svelte-eslint-parser/pull/479) [`850ad74`](https://github.com/sveltejs/svelte-eslint-parser/commit/850ad74176416978e360f6c23e4479bff81baea6) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for `$derived.by` type

### Patch Changes

- [#483](https://github.com/sveltejs/svelte-eslint-parser/pull/483) [`f722d7c`](https://github.com/sveltejs/svelte-eslint-parser/commit/f722d7c047706b4a051999b28d482d0069667da5) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: for svelte v5.0.0-next.68 & support optional `{@render}`

## 0.34.0-next.9

### Minor Changes

- [#476](https://github.com/sveltejs/svelte-eslint-parser/pull/476) [`92aeee3`](https://github.com/sveltejs/svelte-eslint-parser/commit/92aeee35ee7bcfd27d8bc1920a341ddf14fa926b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: change AST of `{@render}` and `{#snippet}` to match the latest version of svelte v5.

## 0.34.0-next.8

### Patch Changes

- [#468](https://github.com/sveltejs/svelte-eslint-parser/pull/468) [`133cd24`](https://github.com/sveltejs/svelte-eslint-parser/commit/133cd24b47795fd104df903d2fef31904ab74710) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update Svelte 5 version

## 0.34.0-next.7

### Minor Changes

- [#464](https://github.com/sveltejs/svelte-eslint-parser/pull/464) [`d531e4e`](https://github.com/sveltejs/svelte-eslint-parser/commit/d531e4e6552e88fe47825436ee26619039cadc7d) Thanks [@baseballyama](https://github.com/baseballyama)! - breaking: drop @typescript-eslint v4 support

### Patch Changes

- [#467](https://github.com/sveltejs/svelte-eslint-parser/pull/467) [`e27a3de`](https://github.com/sveltejs/svelte-eslint-parser/commit/e27a3de8d97dd934a8dc0097374eee3ad3ee61ff) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: update `$inspect` types

- [#466](https://github.com/sveltejs/svelte-eslint-parser/pull/466) [`d5b3322`](https://github.com/sveltejs/svelte-eslint-parser/commit/d5b3322e19b7208815ba4251d75cf46d511cd4f1) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: add `$state.frozen` support

## 0.34.0-next.6

### Minor Changes

- [#446](https://github.com/sveltejs/svelte-eslint-parser/pull/446) [`168f920`](https://github.com/sveltejs/svelte-eslint-parser/commit/168f9209e8ea9f2a1ef2fad28728f6aa0963638f) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for `$inspect` and `$effect.root`

## 0.34.0-next.5

### Minor Changes

- [#440](https://github.com/sveltejs/svelte-eslint-parser/pull/440) [`726f21f`](https://github.com/sveltejs/svelte-eslint-parser/commit/726f21fc7a520abe8b7b0be268f2ceb9b3205531) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: skip type injection if template uses TypeScript

- [#441](https://github.com/sveltejs/svelte-eslint-parser/pull/441) [`34232c5`](https://github.com/sveltejs/svelte-eslint-parser/commit/34232c58b49abdb362d74d849e80ef5607d0ce52) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: add type of `$effect.active`

## 0.34.0-next.4

### Patch Changes

- [#438](https://github.com/sveltejs/svelte-eslint-parser/pull/438) [`c21b54c`](https://github.com/sveltejs/svelte-eslint-parser/commit/c21b54ced7984aaeaac6b12ff66bfc4cc0712caf) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: incorrect location for `{ #await expr then v }` with spaces

## 0.34.0-next.3

### Minor Changes

- [#435](https://github.com/sveltejs/svelte-eslint-parser/pull/435) [`7508680`](https://github.com/sveltejs/svelte-eslint-parser/commit/7508680b3a88c951fa3fe0bdd9b59b21d6034b27) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: improve props type

### Patch Changes

- [#434](https://github.com/sveltejs/svelte-eslint-parser/pull/434) [`0ef067b`](https://github.com/sveltejs/svelte-eslint-parser/commit/0ef067b57ab8897cff03f8793c2767e6d0b83274) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: incorrect location when there is whitespace at the beginning of block

## 0.34.0-next.2

### Minor Changes

- [#430](https://github.com/sveltejs/svelte-eslint-parser/pull/430) [`af1bae5`](https://github.com/sveltejs/svelte-eslint-parser/commit/af1bae5d4eb9c9605e4f2ad66590b14f1bfa9a55) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: apply correct type information to `$derived` argument expression

- [#431](https://github.com/sveltejs/svelte-eslint-parser/pull/431) [`ab13a46`](https://github.com/sveltejs/svelte-eslint-parser/commit/ab13a4662410014ad7d53fc7664bd5b464f15cbe) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for `{#snippet}` and `{@render}`

## 0.34.0-next.1

### Minor Changes

- [#425](https://github.com/sveltejs/svelte-eslint-parser/pull/425) [`ff242c4`](https://github.com/sveltejs/svelte-eslint-parser/commit/ff242c4abc322fd6bc93fda9fb30da14d73a847e) Thanks [@baseballyama](https://github.com/baseballyama)! - feat: Support runes

- [#426](https://github.com/sveltejs/svelte-eslint-parser/pull/426) [`9793cb0`](https://github.com/sveltejs/svelte-eslint-parser/commit/9793cb0d4520b1d5ae9e1f0aa5aff1c8b84cebb6) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: apply runes to `*.svelte.js` and `*.svelte.ts`.

## 0.34.0-next.0

### Minor Changes

- [#421](https://github.com/sveltejs/svelte-eslint-parser/pull/421) [`59fc0e9`](https://github.com/sveltejs/svelte-eslint-parser/commit/59fc0e90bdd20f208a4ae8c3527ea51acf106811) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: (experimental) partial support for Svelte v5 parser

## 0.33.1

### Patch Changes

- [#409](https://github.com/sveltejs/svelte-eslint-parser/pull/409) [`b63c305`](https://github.com/sveltejs/svelte-eslint-parser/commit/b63c3050f4f33b16ebc5902d98556efc4c58cf4c) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: infinite loop in attr.ts

## 0.33.0

### Minor Changes

- [#395](https://github.com/sveltejs/svelte-eslint-parser/pull/395) [`d9cb8ae`](https://github.com/sveltejs/svelte-eslint-parser/commit/d9cb8ae9b188e546d1d7552b85b72a31c01ccdbd) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: improve let directive type

### Patch Changes

- [#396](https://github.com/sveltejs/svelte-eslint-parser/pull/396) [`a4d31f0`](https://github.com/sveltejs/svelte-eslint-parser/commit/a4d31f07f5c93057e276fa804d4e2b267264dc0f) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: update postcss to 8.4.28

## 0.32.2

### Patch Changes

- [#385](https://github.com/sveltejs/svelte-eslint-parser/pull/385) [`71db4ec`](https://github.com/sveltejs/svelte-eslint-parser/commit/71db4ecc1c967cc6c8f17fd5a55a33c255742a3a) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: typescript-eslint v6 compatibility

## 0.32.1

### Patch Changes

- [#371](https://github.com/sveltejs/svelte-eslint-parser/pull/371) [`cf20c86`](https://github.com/sveltejs/svelte-eslint-parser/commit/cf20c86d0c9ab250ca3607ac919bca6988e8cc78) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: wrong type information for `#await` with same id

## 0.32.0

### Minor Changes

- [#364](https://github.com/sveltejs/svelte-eslint-parser/pull/364) [`f5de496`](https://github.com/sveltejs/svelte-eslint-parser/commit/f5de4966371e7ceaa43449c561f23b2fe01d018f) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for Svelte v4

- [#358](https://github.com/sveltejs/svelte-eslint-parser/pull/358) [`438be64`](https://github.com/sveltejs/svelte-eslint-parser/commit/438be641c211146a86520db7c29b6771f14fe8c8) Thanks [@marekdedic](https://github.com/marekdedic)! - only parsing styles on-demand

## 0.31.0

### Minor Changes

- [#340](https://github.com/sveltejs/svelte-eslint-parser/pull/340) [`d170f91`](https://github.com/sveltejs/svelte-eslint-parser/commit/d170f915c6133aa42f6d3d1c9fb7bc81269f77eb) Thanks [@marekdedic](https://github.com/marekdedic)! - added PostCSS AST of styles to parser services

### Patch Changes

- [#354](https://github.com/sveltejs/svelte-eslint-parser/pull/354) [`ff24f99`](https://github.com/sveltejs/svelte-eslint-parser/commit/ff24f99d70a97ec13c05459314c08da4f29546eb) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: crash when using component and `{@const}`

## 0.30.0

### Minor Changes

- [#343](https://github.com/sveltejs/svelte-eslint-parser/pull/343) [`2c76b13`](https://github.com/sveltejs/svelte-eslint-parser/commit/2c76b1378bad41bf8493d06813eb28283755d570) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add experimental support for Svelte v4

## 0.29.0

### 💥 Breaking Changes

- [#334](https://github.com/sveltejs/svelte-eslint-parser/pull/334) [`fa4adf6`](https://github.com/sveltejs/svelte-eslint-parser/commit/fa4adf6038810573df6cdead34800fb41b3ab3d5) Thanks [@baseballyama](https://github.com/baseballyama)! - **BREAKING CHANGE**: Drop Node 12 support

### Minor Changes

- [#338](https://github.com/sveltejs/svelte-eslint-parser/pull/338) [`af55230`](https://github.com/sveltejs/svelte-eslint-parser/commit/af5523076d72e29d9f7cc2708d514564a2fafb45) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: improve `$$` vars type

### Patch Changes

- [#337](https://github.com/sveltejs/svelte-eslint-parser/pull/337) [`21c0dc6`](https://github.com/sveltejs/svelte-eslint-parser/commit/21c0dc6a0b4a5e864e0181dfbb31f4b47edcefd1) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: wrong scope for ts in `bind:`

## 0.28.0

### Minor Changes

- [#329](https://github.com/sveltejs/svelte-eslint-parser/pull/329) [`45c958e`](https://github.com/sveltejs/svelte-eslint-parser/commit/45c958e752ed2ea1b7d8df3fe21ffc0f7a664275) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: export meta object

## 0.27.0

### Minor Changes

- [#314](https://github.com/sveltejs/svelte-eslint-parser/pull/314) [`96a72a5`](https://github.com/sveltejs/svelte-eslint-parser/commit/96a72a5d9e549c6f433a104b5db296684015303c) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: improve component event handler type

- [#325](https://github.com/sveltejs/svelte-eslint-parser/pull/325) [`36b01ec`](https://github.com/sveltejs/svelte-eslint-parser/commit/36b01ecb3abf6b793127e577d0aa213f9fea32a3) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: support for `use:` directive parameter type

## 0.26.1

### Patch Changes

- [#316](https://github.com/sveltejs/svelte-eslint-parser/pull/316) [`501c1b4`](https://github.com/sveltejs/svelte-eslint-parser/commit/501c1b474c14ab3d1655391bacc16c300493cf1c) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: crash with plain `this` attribute.

## 0.26.0

### Minor Changes

- [#312](https://github.com/sveltejs/svelte-eslint-parser/pull/312) [`9856029`](https://github.com/sveltejs/svelte-eslint-parser/commit/98560296e59c8e39cf126a1a66a2deda0095439e) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for `<svelte:document>`

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
