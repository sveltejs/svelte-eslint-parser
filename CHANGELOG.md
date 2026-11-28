# svelte-eslint-parser

## 2.0.0-next.0

### Major Changes

- [#1108](https://github.com/sveltejs/svelte-eslint-parser/pull/1108) [`b545b6d`](https://github.com/sveltejs/svelte-eslint-parser/commit/b545b6d6b1c10d706f7f0f3fb350abc986e120db) Thanks [@baseballyama](https://github.com/baseballyama)! - feat!: drop support for old Node.js versions. The supported range is now `^22.13.0 || ^24.0.0 || >=26.0.0`.

- [#1111](https://github.com/sveltejs/svelte-eslint-parser/pull/1111) [`907453f`](https://github.com/sveltejs/svelte-eslint-parser/commit/907453f808bd40ae98b712114d87b488b5607a04) Thanks [@baseballyama](https://github.com/baseballyama)! - feat!: remove the deprecated `declaration` property of `SvelteConstTag`. Use `declarations` instead.

- [#1112](https://github.com/sveltejs/svelte-eslint-parser/pull/1112) [`42e7372`](https://github.com/sveltejs/svelte-eslint-parser/commit/42e73729eabb32868cc5c4e4009e89bd02335410) Thanks [@baseballyama](https://github.com/baseballyama)! - feat!: require ESLint 10. `eslint` is now a peer dependency (`^10.0.0`), and `espree`, `eslint-scope` and `eslint-visitor-keys` are updated to 11, 9 and 5.

- [#1109](https://github.com/sveltejs/svelte-eslint-parser/pull/1109) [`8b3fff7`](https://github.com/sveltejs/svelte-eslint-parser/commit/8b3fff7cf623de082eee435a3e803fb24f5b5777) Thanks [@baseballyama](https://github.com/baseballyama)! - feat!: declare `@typescript-eslint/parser` (`^8.56.0`) and `typescript` (`>=4.8.4 <6.1.0`) as optional peer dependencies

### Patch Changes

- [#1122](https://github.com/sveltejs/svelte-eslint-parser/pull/1122) [`493500f`](https://github.com/sveltejs/svelte-eslint-parser/commit/493500fa7d2ea59346f8179452909fce9ba4bae1) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: raise the minimum versions of `postcss` (`^8.5.34`), `postcss-selector-parser` (`^7.2.1`) and `semver` (`^7.8.6`)

## 1.13.0

### Minor Changes

- [#1097](https://github.com/sveltejs/svelte-eslint-parser/pull/1097) [`4f48416`](https://github.com/sveltejs/svelte-eslint-parser/commit/4f484161ea970b844b7909ea5874bd478ab2c47a) Thanks [@that-richan](https://github.com/that-richan)! - Type the setter of a function binding on a component (such as `<Select bind:value={() => mode, (v) => (mode = v)}>`) with the getter's return type, as svelte2tsx does, instead of the bound prop's type. A `null` getter still takes the prop's type.

- [#1098](https://github.com/sveltejs/svelte-eslint-parser/pull/1098) [`da105ab`](https://github.com/sveltejs/svelte-eslint-parser/commit/da105abb7b9476752b49f85aae1fab1463a3df4e) Thanks [@GBra-4-669](https://github.com/GBra-4-669)! - fix: allow a chained name in `transition:`, `in:`, `out:`, `animate:` and `use:` with Svelte 5

- [#1084](https://github.com/sveltejs/svelte-eslint-parser/pull/1084) [`42323df`](https://github.com/sveltejs/svelte-eslint-parser/commit/42323dfa2f1d47a6fe0ccc9dd89422aacc278d11) Thanks [@baseballyama](https://github.com/baseballyama)! - Type the setter of a function binding on an HTML or special element (such as `<input bind:value={() => text, (v) => (text = v)}>`) with the getter's return type instead of implicit `any`.

### Patch Changes

- [#1032](https://github.com/sveltejs/svelte-eslint-parser/pull/1032) [`a6aa72b`](https://github.com/sveltejs/svelte-eslint-parser/commit/a6aa72bcf92e96b301851a579bb5899813e09716) Thanks [@nikolas-sapa](https://github.com/nikolas-sapa)! - fix: ignore `<!--` and `-->` between top-level rules in `<style>`, as CSS does

- [#1086](https://github.com/sveltejs/svelte-eslint-parser/pull/1086) [`1d5a2fb`](https://github.com/sveltejs/svelte-eslint-parser/commit/1d5a2fb20a5d9465615dd2d9754028bc8627e6a8) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: report the right location for a parse error from a parser that gives only `lineNumber` and a 1-based `column` when `<script>` blocks are on the same line

- [#1088](https://github.com/sveltejs/svelte-eslint-parser/pull/1088) [`e954739`](https://github.com/sveltejs/svelte-eslint-parser/commit/e9547399c6d74ab1294bf5656583c9b0757cfa8f) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: update the location in the first line of a parse error message that has a code frame after it, for same-line `<script>` blocks

- [#1089](https://github.com/sveltejs/svelte-eslint-parser/pull/1089) [`9bde6b5`](https://github.com/sveltejs/svelte-eslint-parser/commit/9bde6b5b8899e357a78027da301f0643c8586ed8) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: keep comments around a template expression that Svelte does not attach to it, such as `/* a */` in `{/* a */ (value)}` and `/* b */` in `{fn(value) /* b */}`, and parse `{(/* a */ (value)) /* b */}`

- [#1104](https://github.com/sveltejs/svelte-eslint-parser/pull/1104) [`4bcfd21`](https://github.com/sveltejs/svelte-eslint-parser/commit/4bcfd215760015025be5099fd5134e8c2ac8d847) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: detect a parser that wraps `@typescript-eslint/parser` on Windows when the cwd has no drive letter, such as a UNC path

- [#1090](https://github.com/sveltejs/svelte-eslint-parser/pull/1090) [`51ea313`](https://github.com/sveltejs/svelte-eslint-parser/commit/51ea31328a6c10a3076a3ac89b453a04a53d99b2) Thanks [@that-richan](https://github.com/that-richan)! - fix: look a component prop up in each member of a props union, so snippet parameters and attributes are typed for unions of large props such as HTML attributes and for props only some members declare

- [#1092](https://github.com/sveltejs/svelte-eslint-parser/pull/1092) [`ea3a0f1`](https://github.com/sveltejs/svelte-eslint-parser/commit/ea3a0f12f107f47ba69f71fcce7367ac94b100ac) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: keep comments in `{@render}` tags, such as `/* a */` in `{@render foo() /* a */}`, as comments

- [#1102](https://github.com/sveltejs/svelte-eslint-parser/pull/1102) [`c942d9c`](https://github.com/sveltejs/svelte-eslint-parser/commit/c942d9c3b78a9285f78fe3f24a7acfbfae2d6b2e) Thanks [@officialasishkumar](https://github.com/officialasishkumar)! - fix: parse a `<script>` that starts with `(`, `[` or a template literal after another `<script>` whose last statement has no semicolon

- [#995](https://github.com/sveltejs/svelte-eslint-parser/pull/995) [`88aa3bd`](https://github.com/sveltejs/svelte-eslint-parser/commit/88aa3bd34d68250166e6fe3d928e8ce9ffb96813) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: do not treat exports in Svelte 5 `<script module>` as props

- [#1096](https://github.com/sveltejs/svelte-eslint-parser/pull/1096) [`93a946e`](https://github.com/sveltejs/svelte-eslint-parser/commit/93a946e642ee52e826a50b9a728461ca05de882a) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: ignore `<script>` and `<style>` inside mustache tags such as `{@html ...}`

- [#1074](https://github.com/sveltejs/svelte-eslint-parser/pull/1074) [`05db71e`](https://github.com/sveltejs/svelte-eslint-parser/commit/05db71e179f3e3728a5507944339a807e14b6d05) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: parse template expressions that end with a line comment, such as `{value // note` followed by `}` on the next line, and parenthesized expressions with a trailing comment, such as `{(value) /* note */}`

- [#1101](https://github.com/sveltejs/svelte-eslint-parser/pull/1101) [`04aa88e`](https://github.com/sveltejs/svelte-eslint-parser/commit/04aa88ed3f09b3c5250ef30503459b075881466a) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: translate imported components under the ts.sys hook when several `eslint.config.js` files registered tsconfigRootDir candidates, instead of falling back to the ambient `*.svelte` module

## 1.12.0

### Minor Changes

- [#971](https://github.com/sveltejs/svelte-eslint-parser/pull/971) [`a3e8905`](https://github.com/sveltejs/svelte-eslint-parser/commit/a3e8905abe25d7263c53f4a8e601ec7a665a52bb) Thanks [@baseballyama](https://github.com/baseballyama)! - Treat a binding to a variable (such as `bind:this={el}` or `bind:value={text}`) as a write of it for type checking, so TypeScript no longer keeps the variable narrowed to its initial value (e.g. `null`) inside closures, and type the setter of a `bind:this` function binding with the element or component instance type instead of implicit `any`.

- [#973](https://github.com/sveltejs/svelte-eslint-parser/pull/973) [`646ce26`](https://github.com/sveltejs/svelte-eslint-parser/commit/646ce26ff7c92d7b9329dffba22ff46203569935) Thanks [@baseballyama](https://github.com/baseballyama)! - Select the matching members of a component's discriminated union props by the attributes whose values are fixed in the markup (e.g. `mode="single"`), so other attributes such as `upload={(file) => …}` are typed from that member instead of an unusable union that left callback parameters as implicit `any`.

- [#974](https://github.com/sveltejs/svelte-eslint-parser/pull/974) [`cade11c`](https://github.com/sveltejs/svelte-eslint-parser/commit/cade11c96a06321ab63048cbb8e341dd4a769044) Thanks [@baseballyama](https://github.com/baseballyama)! - Keep TypeScript's narrowing of property paths such as `item.list`, and of reassigned variables, inside `{#each}` blocks (e.g. under `{#if item.kind === "a"}`), so they no longer fall back to the unnarrowed type inside the block.

- [#970](https://github.com/sveltejs/svelte-eslint-parser/pull/970) [`2cfe2db`](https://github.com/sveltejs/svelte-eslint-parser/commit/2cfe2dba8e7e992297e1d76c20bc6a808028fcfa) Thanks [@baseballyama](https://github.com/baseballyama)! - Infer a Svelte 5 generic component's type arguments from the attributes passed to it, so snippet parameters, callback attributes, and function binding setters get the inferred types (e.g. `row` in `<Table rows={users}>{#snippet row(user)}…{/snippet}</Table>` is typed from `users`) instead of the `generics` constraint.

- [#972](https://github.com/sveltejs/svelte-eslint-parser/pull/972) [`b140352`](https://github.com/sveltejs/svelte-eslint-parser/commit/b140352463043d69ccf2a59fb1ebfb8d4b03c5a2) Thanks [@baseballyama](https://github.com/baseballyama)! - Make a Svelte 5 `generics` component a generic type too, so `Foo<Row>` (e.g. in `let instance = $state<Foo<Row>>()`) names its instance with those type arguments instead of failing to resolve; a bare `Foo` keeps working through defaults taken from the constraints.

### Patch Changes

- [#1016](https://github.com/sveltejs/svelte-eslint-parser/pull/1016) [`0812923`](https://github.com/sveltejs/svelte-eslint-parser/commit/081292300b65f6e05cbd397b52264b2158d1accc) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: resolve a component's own attributes in the outer scope, not in its `let:` scope

- [#1015](https://github.com/sveltejs/svelte-eslint-parser/pull/1015) [`a5bacf9`](https://github.com/sveltejs/svelte-eslint-parser/commit/a5bacf93aa79e950511182b6fe43035663ca7513) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: match `<script>`, `<style>` and `<template>` tags case-sensitively like Svelte, so a component named `Script`, `Style` or `Template` is not parsed as a block

- [#1075](https://github.com/sveltejs/svelte-eslint-parser/pull/1075) [`d710872`](https://github.com/sveltejs/svelte-eslint-parser/commit/d7108721e43bb73af4429c967af250f99770aa7e) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: parse a sequence expression such as `(a, b)` as the whole `{#each}` expression

- [#1012](https://github.com/sveltejs/svelte-eslint-parser/pull/1012) [`1375088`](https://github.com/sveltejs/svelte-eslint-parser/commit/13750884095649572523b52c9f144967db214dcb) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: do not resolve an each block key to a declaration in its body

- [#1069](https://github.com/sveltejs/svelte-eslint-parser/pull/1069) [`5bde947`](https://github.com/sveltejs/svelte-eslint-parser/commit/5bde947eef7079a32f67bc8a153661522008f426) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: parse a `generics` attribute with a `const` type parameter

- [#1000](https://github.com/sveltejs/svelte-eslint-parser/pull/1000) [`c30cf6d`](https://github.com/sveltejs/svelte-eslint-parser/commit/c30cf6d7f347d1efa0ef4694e111a8669f9030d8) Thanks [@joshuabremer](https://github.com/joshuabremer)! - fix: load the TypeScript that typescript-eslint uses instead of the newest reachable copy, so a hoisted TypeScript 7 in a pnpm monorepo no longer breaks JS components

- [#996](https://github.com/sveltejs/svelte-eslint-parser/pull/996) [`97a08ab`](https://github.com/sveltejs/svelte-eslint-parser/commit/97a08abb24df6972fca18df75e0a04d32f0c7e99) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: remove leftover scope references from the type of `use:` directive parameters, which crashed some rules (e.g. `sonarjs/no-unused-collection`) with `lang="ts"`

- [#997](https://github.com/sveltejs/svelte-eslint-parser/pull/997) [`bfced4b`](https://github.com/sveltejs/svelte-eslint-parser/commit/bfced4b01013e6c2fba5799903c35a313482d0bd) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: do not narrow Svelte v4 `export let` props to the type of their default value (e.g. no more false positives from `@typescript-eslint/no-unnecessary-condition` for `href ?? fallback`)

- [#1018](https://github.com/sveltejs/svelte-eslint-parser/pull/1018) [`04bd3b6`](https://github.com/sveltejs/svelte-eslint-parser/commit/04bd3b6834db617d3490f69515ff7146a31cb7b6) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: keep a component's `let:` names out of children with a named `slot`

- [#1049](https://github.com/sveltejs/svelte-eslint-parser/pull/1049) [`17bb73f`](https://github.com/sveltejs/svelte-eslint-parser/commit/17bb73f2bd1306aab4cb6f79311c7790c3b61509) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: end `styleNodeRange()` at the end of the style node instead of one character after it, and end `styleNodeLoc()` of the root at the end of the style code

- [#1054](https://github.com/sveltejs/svelte-eslint-parser/pull/1054) [`d7d3f1d`](https://github.com/sveltejs/svelte-eslint-parser/commit/d7d3f1d5b7bda4d683d8c59a96b375c80e3169f9) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: give the right style selector locations when PostCSS removes comments from the selector

- [#1052](https://github.com/sveltejs/svelte-eslint-parser/pull/1052) [`c73d227`](https://github.com/sveltejs/svelte-eslint-parser/commit/c73d227c635e2346a3bcc7247e64f73470b3090e) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: give the right style selector locations after CR, U+2028 and U+2029 line breaks and for selector nodes that start with a line break

- [#1064](https://github.com/sveltejs/svelte-eslint-parser/pull/1064) [`5c34f23`](https://github.com/sveltejs/svelte-eslint-parser/commit/5c34f23a477ea6f6e34510944aba7e7a7a110c87) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: read a destructured name in `svelte.config.js` that is not the first in its pattern

- [#1051](https://github.com/sveltejs/svelte-eslint-parser/pull/1051) [`fd2db41`](https://github.com/sveltejs/svelte-eslint-parser/commit/fd2db413adf41a0ff562b35f1b8e94fb445665ba) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: keep reading a `svelte.config.js` value past a spread that does not set it

- [#998](https://github.com/sveltejs/svelte-eslint-parser/pull/998) [`157dfa1`](https://github.com/sveltejs/svelte-eslint-parser/commit/157dfa1b5436d1b58c1d841eb3e25ef27e182c6f) Thanks [@that-richan](https://github.com/that-richan)! - fix: resolve `.svelte` imports through `package.json` `imports` and `exports` subpaths to the component's prop types under the experimental `ts.sys` hook

## 1.11.0

### Minor Changes

- [#1013](https://github.com/sveltejs/svelte-eslint-parser/pull/1013) [`a5ad365`](https://github.com/sveltejs/svelte-eslint-parser/commit/a5ad365a7337aadad99d733680e3a9c10f9a08f4) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: allow a member name in `transition:`, `in:`, `out:` and `animate:` with Svelte 5

## 1.10.2

### Patch Changes

- [#1028](https://github.com/sveltejs/svelte-eslint-parser/pull/1028) [`dad3108`](https://github.com/sveltejs/svelte-eslint-parser/commit/dad3108298ae733b4883156ae789859d39edb4cb) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: parse `await` inside `{#each}`, `{#snippet}`, `{:then}`, `{:catch}` and `let:` bodies with `experimental.async`

- [#1039](https://github.com/sveltejs/svelte-eslint-parser/pull/1039) [`c325918`](https://github.com/sveltejs/svelte-eslint-parser/commit/c325918dd9ee2d5a597096bfd23086040a1a799d) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: avoid rebuilding TypeScript programs when the experimental ts.sys hook refreshes a component's companion

- [#1011](https://github.com/sveltejs/svelte-eslint-parser/pull/1011) [`50c5187`](https://github.com/sveltejs/svelte-eslint-parser/commit/50c5187e8ce9791e8b979b8627d5aa22f50e0603) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: parse `{@const}` tags whose value is wrapped in parentheses

- [#1030](https://github.com/sveltejs/svelte-eslint-parser/pull/1030) [`f5ef901`](https://github.com/sveltejs/svelte-eslint-parser/commit/f5ef9018745af16a27b1911ec753f611574ab874) Thanks [@officialasishkumar](https://github.com/officialasishkumar)! - fix: keep the narrowing of enclosing blocks in `$derived()` of template declaration tags

- [#1031](https://github.com/sveltejs/svelte-eslint-parser/pull/1031) [`b32e793`](https://github.com/sveltejs/svelte-eslint-parser/commit/b32e793bd305e6e9eb76875173462ded1582bba2) Thanks [@officialasishkumar](https://github.com/officialasishkumar)! - fix: detect the `parser` of `typescript-eslint` when there are multiple candidate `tsconfigRootDir`s, e.g. in a monorepo

- [#1026](https://github.com/sveltejs/svelte-eslint-parser/pull/1026) [`b351fe9`](https://github.com/sveltejs/svelte-eslint-parser/commit/b351fe91675157ebc2039c3445793077a2a7bab1) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: stop a line comment right before `</script>` from covering the `</script>` tag

- [#1048](https://github.com/sveltejs/svelte-eslint-parser/pull/1048) [`bb98f38`](https://github.com/sveltejs/svelte-eslint-parser/commit/bb98f38426278c54f91acb5ad40a6eb14c2ffd4e) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: give the `extends` token in the `generics` attribute the correct location

- [#1025](https://github.com/sveltejs/svelte-eslint-parser/pull/1025) [`e6a1cc2`](https://github.com/sveltejs/svelte-eslint-parser/commit/e6a1cc2355aa1c44cd2ef0dd732e910063f0cd9f) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: decide on runes mode from the rune references that Svelte counts, so a rune name that is not a reference, a declared rune name, a rune name in a TypeScript type or a store subscription does not turn on runes mode

- [#1021](https://github.com/sveltejs/svelte-eslint-parser/pull/1021) [`66232f8`](https://github.com/sveltejs/svelte-eslint-parser/commit/66232f89aab310fe08a9a6d95a7e11bcdc22e5b3) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: turn on runes mode for a top-level `await`, like the Svelte compiler

- [#1024](https://github.com/sveltejs/svelte-eslint-parser/pull/1024) [`8bf1c0a`](https://github.com/sveltejs/svelte-eslint-parser/commit/8bf1c0adbdddb39abc4d8a79bad1ac794dee666b) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: parse `<script>` blocks that are on the same line

- [#1044](https://github.com/sveltejs/svelte-eslint-parser/pull/1044) [`4f53349`](https://github.com/sveltejs/svelte-eslint-parser/commit/4f53349e6debacdb99ac9994e915af455e271478) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: read `compilerOptions.experimental.async` and `compilerOptions.experimental.customRenderer` when statically reading `svelte.config.js`

- [#1014](https://github.com/sveltejs/svelte-eslint-parser/pull/1014) [`ed824fd`](https://github.com/sveltejs/svelte-eslint-parser/commit/ed824fd9f74047a1563918e79fa0b613b25b6e40) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: parse a script with the TypeScript parser when no line break follows its last statement

- [#1037](https://github.com/sveltejs/svelte-eslint-parser/pull/1037) [`18c1563`](https://github.com/sveltejs/svelte-eslint-parser/commit/18c1563b35b57c2edbdacad4381fda932642304a) Thanks [@Stadly](https://github.com/Stadly)! - fix: let a package's shipped `X.svelte.d.ts` win over the experimental ts.sys hook's virtual companion

- [#1017](https://github.com/sveltejs/svelte-eslint-parser/pull/1017) [`bf3078f`](https://github.com/sveltejs/svelte-eslint-parser/commit/bf3078ffe41cf60a8637dcb3b557cfc0e4e5e149) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: end lines at U+2028 and U+2029 in node and style locations, like ESLint does

## 1.10.1

### Patch Changes

- [#986](https://github.com/sveltejs/svelte-eslint-parser/pull/986) [`a0bbaa6`](https://github.com/sveltejs/svelte-eslint-parser/commit/a0bbaa6139b6127daffc1fe75ca75c64b215afab) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: mark `$bindable()` props as used, so `no-useless-assignment` does not report writes to them. Also handle `$props()!`, `$props() as T`, `$props() satisfies T` and `<T>$props()`.

- [#989](https://github.com/sveltejs/svelte-eslint-parser/pull/989) [`c845e2e`](https://github.com/sveltejs/svelte-eslint-parser/commit/c845e2ece44721b37f6d365d45a88d910f9a9bf4) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: type `$bindable()` props as possibly `undefined` in `$props()`, so `@typescript-eslint/no-useless-default-assignment` does not report them

- [#988](https://github.com/sveltejs/svelte-eslint-parser/pull/988) [`7f81745`](https://github.com/sveltejs/svelte-eslint-parser/commit/7f8174532953db919a1c82c13168b48d27c084c0) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: let `<svelte:options runes>` take precedence over `compilerOptions.runes`, like the Svelte compiler

## 1.10.0

### Minor Changes

- [#966](https://github.com/sveltejs/svelte-eslint-parser/pull/966) [`cb7ae1a`](https://github.com/sveltejs/svelte-eslint-parser/commit/cb7ae1a8528d8cf5c15e50219baec2517d790293) Thanks [@baseballyama](https://github.com/baseballyama)! - Include instance exports (`export const`, `export function`, `export class`, and `export { … }` in the instance script) in the synthetic component type, so a component instance obtained through `bind:this` exposes them with their real types instead of `any`.

- [#969](https://github.com/sveltejs/svelte-eslint-parser/pull/969) [`2b2181a`](https://github.com/sveltejs/svelte-eslint-parser/commit/2b2181a0d64fae4afaab5c35fa59b52311c1af14) Thanks [@baseballyama](https://github.com/baseballyama)! - Type the setter of a function binding on a component (`bind:value={() => value, (next) => …}`) from the bound prop, so `next` gets the prop's type instead of implicit `any`.

- [#967](https://github.com/sveltejs/svelte-eslint-parser/pull/967) [`3bd0624`](https://github.com/sveltejs/svelte-eslint-parser/commit/3bd06246cefbc94d753b222da3d20febec6ab2d7) Thanks [@baseballyama](https://github.com/baseballyama)! - Type the unannotated parameters of a snippet written as a child of a component from the component's snippet prop of the same name, so `{#snippet content({ close })}` inside `<Popover>` gets the types the component declares instead of implicit `any`.

### Patch Changes

- [#981](https://github.com/sveltejs/svelte-eslint-parser/pull/981) [`db2cbd8`](https://github.com/sveltejs/svelte-eslint-parser/commit/db2cbd8fd21457d10a6ada617434e6a68d028321) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: refresh importers of an edited component when the experimental ts.sys hook is on

- [#978](https://github.com/sveltejs/svelte-eslint-parser/pull/978) [`0dd4674`](https://github.com/sveltejs/svelte-eslint-parser/commit/0dd4674162a4f5751c7f82eddb2e4a47d078d65b) Thanks [@ecelustka](https://github.com/ecelustka)! - Type a `{#snippet}` call as a `Snippet` call instead of `void`, so `@typescript-eslint/no-confusing-void-expression` no longer reports `{@render name()}`.

## 1.9.0

### Minor Changes

- [#913](https://github.com/sveltejs/svelte-eslint-parser/pull/913) [`61b44d6`](https://github.com/sveltejs/svelte-eslint-parser/commit/61b44d6aee97a3fe5057cefa99a97881218361f5) Thanks [@baseballyama](https://github.com/baseballyama)! - Emit a synthetic component `export default` in the virtual TypeScript so importers of a `.svelte` component can resolve its prop, event, and slot types. The experimental `ts.sys` hook (`SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`) now also resolves `.svelte` import specifiers to that virtual code, so `ComponentProps<typeof Foo>` and `mount(Foo, …)` work across files. The synthetic statements are removed again on restore, so the linted file is unaffected. This feature remains experimental and opt-in. See the Experimental section in the README for details and limitations.

- [#607](https://github.com/sveltejs/svelte-eslint-parser/pull/607) [`e9b1f75`](https://github.com/sveltejs/svelte-eslint-parser/commit/e9b1f752b64659a10fac86fdb32de61448e88c8b) Thanks [@baseballyama](https://github.com/baseballyama)! - Preserve JavaScript JSDoc type information when using the TypeScript parser, including Svelte template expressions, stores, and runes.

### Patch Changes

- [#949](https://github.com/sveltejs/svelte-eslint-parser/pull/949) [`9278e1d`](https://github.com/sveltejs/svelte-eslint-parser/commit/9278e1d2f1d5b878880be62caa28e7e278492754) Thanks [@baseballyama](https://github.com/baseballyama)! - Preserve type narrowing from preceding conditions in template `{:else if}` and `{:else}` branches.

## 1.8.1

### Patch Changes

- [#934](https://github.com/sveltejs/svelte-eslint-parser/pull/934) [`1e7352e`](https://github.com/sveltejs/svelte-eslint-parser/commit/1e7352e53cabbec57559a924ec37d85306715d22) Thanks [@baseballyama](https://github.com/baseballyama)! - fix: make the experimental `ts.sys` hook work when the TS program is created before the first `.svelte` parse

## 1.8.0

### Minor Changes

- [#895](https://github.com/sveltejs/svelte-eslint-parser/pull/895) [`fe36e97`](https://github.com/sveltejs/svelte-eslint-parser/commit/fe36e97bf5a30324b318fbde19c60d9f8f6897c8) Thanks [@baseballyama](https://github.com/baseballyama)! - Add an experimental `ts.sys.readFile` hook that speeds up type-aware lint
  of `.svelte` files. Opt in with `SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`. See
  the Experimental section in the README for details.

## 1.7.1

### Patch Changes

- [#899](https://github.com/sveltejs/svelte-eslint-parser/pull/899) [`009dd55`](https://github.com/sveltejs/svelte-eslint-parser/commit/009dd5537dad974ff7fd2ef8dcc12c7e5dd4c018) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Fix parsing TypeScript `$derived(...)` declaration tags inside top-level snippets.

## 1.7.0

### Minor Changes

- [#891](https://github.com/sveltejs/svelte-eslint-parser/pull/891) [`05dd7f0`](https://github.com/sveltejs/svelte-eslint-parser/commit/05dd7f0f3cc04cd0d97186572b28eeb2eb6a581f) Thanks [@dummdidumm](https://github.com/dummdidumm)! - feat: support Svelte 5 declaration tags

### Patch Changes

- [#897](https://github.com/sveltejs/svelte-eslint-parser/pull/897) [`aba2993`](https://github.com/sveltejs/svelte-eslint-parser/commit/aba29936450699a6a867c58fe4fef5d7a66bdc79) Thanks [@ota-meshi](https://github.com/ota-meshi)! - fix: wrong parent type for some nodes

## 1.6.1

### Patch Changes

- [#870](https://github.com/sveltejs/svelte-eslint-parser/pull/870) [`bf736eb`](https://github.com/sveltejs/svelte-eslint-parser/commit/bf736eb085fa92e5d9172c6c24bafc8c57093101) Thanks [@teemingc](https://github.com/teemingc)! - fix: use the Svelte config `compilerOptions.runes` function value if set

## 1.6.0

### Minor Changes

- [#851](https://github.com/sveltejs/svelte-eslint-parser/pull/851) [`dca89f3`](https://github.com/sveltejs/svelte-eslint-parser/commit/dca89f3043b39e6b2ff97691cddff798ca5b16b2) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: add support for comments in tags

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
