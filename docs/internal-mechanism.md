# What the Parser does

The main thing this parser does is parsing the `*.svelte` file and return an AST that can be parsed by ESLint.  
However, this parser does a few other things for a better experience with ESLint integration.

## Entry Point

This parser parses `*.svelte` via `parseForESLint()` and returns the result to ESLint. This is a requirement for ESLint's custom parser.

See https://eslint.org/docs/latest/developer-guide/working-with-custom-parsers.

## Results

### `ast`

Returns the AST of the parses result.

Script AST is [ESTree] compliant AST by default. However, if you used `@typescript-eslint/parser` as script parser, it may contain [TypeScript AST](https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/ast-spec).  
However, the parser assigns a special node `SvelteReactiveStatement` to the parsed result of `$:`.  
`SvelteReactiveStatement` is a special node to avoid confusing ESLint check rules with `LabeledStatement`.

[ESTree]: https://github.com/estree/estree

The HTML template part returns a special AST. See [AST.md](./AST.md).

The `Program` node contains `tokens` and `comments`. This is a requirement for ESLint's custom parser.

See https://eslint.org/docs/latest/developer-guide/working-with-custom-parsers#the-ast-specification.

### `services`

This parser returns the `services` returned by the script parser.  
In particular, typescript-eslint contains important information such as type information in `services`. The parser does not edit the `services`, but there is a trick in parsing the script to get the correct result of the `services` returned by the script parser.

When parsing the script, the parser does not pass only the `<script>` part, but generates virtual script code including the script that converted the HTML template into a script, and lets the script parser parse it.

For example, if you enter `*.svelte` template to listen for input events:

```svelte
<script lang="ts">
  function inputHandler() {
    // process
  }
</script>

<input on:input={inputHandler} />
```

Parse the following virtual script code as a script:

```ts
function inputHandler() {
  // process
}
function $_render1() {
  inputHandler as (
    e: "input" extends keyof HTMLElementEventMap
      ? HTMLElementEventMap["input"]
      : CustomEvent<any>,
  ) => void;
}
```

This gives the correct type information to the inputHandler when used with `on:input={inputHandler}`.

The script AST for the HTML template is then remapped to the template AST.

You can check what happens to virtual scripts in the Online Demo.  
https://sveltejs.github.io/svelte-eslint-parser/virtual-script-code/

See also [Scope Types](#scope-types) section.

### `scopeManager`

This parser returns a ScopeManager instance.  
ScopeManager is used in variable analysis such as [no-unused-vars](https://eslint.org/docs/latest/rules/no-unused-vars) and [no-undef](https://eslint.org/docs/latest/rules/no-undef) rules.  
See https://eslint.org/docs/latest/developer-guide/scope-manager-interface for details.

The parser will generate a virtual script so that it can parse the correct scope.  
For example, when using `{#each}` and `{@const}`:

```svelte
<script lang="ts">
  const array = [1, 2, 3];
</script>

{#each array as e}
  {@const ee = e * 2}
  {ee}
{/each}
```

Parse the following virtual script code as a script:

```ts
const array = [1, 2, 3];
function $_render1() {
  Array.from(array).forEach((e) => {
    const ee = e * 2;
    ee;
  });
}
```

This ensures that the variable `e` defined by `{#each}` is correctly scoped only within `{#each}`.

Also, this parser returns special results for variables used in `$: foo = expression` and `$count` for proper analysis.

It also adds virtual references for variables that are marked specially used in `*.svelte` (e.g. `export let` and `$ref`). This is a hack that is also used in typescript-eslint.  
https://github.com/typescript-eslint/typescript-eslint/issues/4508#issuecomment-1030508403

You can also check the results [Online DEMO](https://sveltejs.github.io/svelte-eslint-parser/scope/).

### `visitorKeys`

ESLint custom parsers that provide their own AST require `visitorKeys` to properly traverse the node.

See https://eslint.org/docs/latest/developer-guide/working-with-custom-parsers.

## Scope Types

TypeScript's type inference is pretty good, so parsing Svelte as-is gives some wrong type information.

e.g.

<!-- prettier-ignore -->
```ts
export let foo: { bar: number } | null = null;

$: console.log(foo && foo.bar);
                   // ^ never type
```

(You can see it on [TypeScript Online Playground](https://www.typescriptlang.org/play?#code/KYDwDg9gTgLgBAG2PAZhCAuOBvOAjAQyiwDsBXAWz2CjgF84AfOchBOAXhbLYFgAoAQBIsAYwgkAzhCQA6BBADmACjQQ4AMg1w1swlACUAbgFwz5i5YsB6a3AB6LYADcacGAE8wwAUA))

In the above code, foo in `$:` should be `object` or `null` in `*.svelte`, but TypeScript infers that it is `null` only.

To avoid this problem, the parser generates virtual code and traps statements within `$:` to function scope.
Then restore it to have the correct AST and ScopeManager.

For example:

```svelte
<script lang="ts">
  export let foo: { bar: number } | null = null;

  $: console.log(foo && foo.bar);

  $: r = foo && foo.bar;

  $: ({ bar: n } = foo || { bar: 42 });
</script>

{foo && foo.bar}
```

Parse the following virtual script code as a script:

```ts
export let foo: { bar: number } | null = null;

$: function $_reactiveStatementScopeFunction1() {
  console.log(foo && foo.bar);
}

$: let r = $_reactiveVariableScopeFunction2();
function $_reactiveVariableScopeFunction2() {
  let $_tmpVar3;
  return ($_tmpVar3 = foo && foo.bar);
}

$: let { bar: n } = $_reactiveVariableScopeFunction4();
function $_reactiveVariableScopeFunction4() {
  let $_tmpVar5;
  return ($_tmpVar5 = foo || { bar: 42 });
}
function $_render6() {
  foo && foo.bar;
}
```
