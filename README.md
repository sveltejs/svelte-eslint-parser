# svelte-eslint-parser

[Svelte] parser for [ESLint].  
You can check it on [Online DEMO](https://ota-meshi.github.io/svelte-eslint-parser/playground).

::: ***WORKS IN PROGRESS*** :::

::: ***This Parser is still in an EXPERIMENTAL STATE*** :::

[![NPM license](https://img.shields.io/npm/l/svelte-eslint-parser.svg)](https://www.npmjs.com/package/svelte-eslint-parser)
[![NPM version](https://img.shields.io/npm/v/svelte-eslint-parser.svg)](https://www.npmjs.com/package/svelte-eslint-parser)
[![NPM downloads](https://img.shields.io/badge/dynamic/json.svg?label=downloads&colorB=green&suffix=/day&query=$.downloads&uri=https://api.npmjs.org//downloads/point/last-day/svelte-eslint-parser&maxAge=3600)](http://www.npmtrends.com/svelte-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dw/svelte-eslint-parser.svg)](http://www.npmtrends.com/svelte-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dm/svelte-eslint-parser.svg)](http://www.npmtrends.com/svelte-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dy/svelte-eslint-parser.svg)](http://www.npmtrends.com/svelte-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dt/svelte-eslint-parser.svg)](http://www.npmtrends.com/svelte-eslint-parser)
[![Build Status](https://github.com/ota-meshi/svelte-eslint-parser/workflows/CI/badge.svg?branch=main)](https://github.com/ota-meshi/svelte-eslint-parser/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/ota-meshi/svelte-eslint-parser/badge.svg?branch=main)](https://coveralls.io/github/ota-meshi/svelte-eslint-parser?branch=main)

## ❓ Why?

[Svelte] has the official ESLint plugin the [eslint-plugin-svelte3]. The [eslint-plugin-svelte3] works well enough to check scripts. However, it does not handle the AST of the template, which makes it very difficult for third parties to create their own the [ESLint] rules for the [Svelte].

The [`svelte-eslint-parser`] aims to make it easy to create your own rules for the [Svelte] by allowing the template AST to be used in the rules.

## ❗ Attention

The [`svelte-eslint-parser`] can not be used with the [eslint-plugin-svelte3].

[`svelte-eslint-parser`]: https://www.npmjs.com/package/svelte-eslint-parser

## 💿 Installation

```bash
npm install --save-dev eslint svelte-eslint-parser
```

## 📖 Usage

1. Write `overrides.parser` option into your `.eslintrc.*` file.
2. Use glob patterns or `--ext .svelte` CLI option.

```json
{
    "extends": "eslint:recommended",
    "overrides": [
        {
            "files": ["*.svelte"],
            "parser": "svelte-eslint-parser"
        }
    ]
}
```

```console
$ eslint "src/**/*.{js,svelte}"
# or
$ eslint src --ext .svelte
```

## 🔧 Options

`parserOptions` has the same properties as what [espree](https://github.com/eslint/espree#usage), the default parser of ESLint, is supporting.
For example:

```json
{
    "parser": "svelte-eslint-parser",
    "parserOptions": {
        "sourceType": "module",
        "ecmaVersion": 2021,
        "ecmaFeatures": {
            "globalReturn": false,
            "impliedStrict": false,
            "jsx": false
        }
    }
}
```

### parserOptions.parser

You can use `parserOptions.parser` property to specify a custom parser to parse `<script>` tags.
Other properties than parser would be given to the specified parser.
For example:

```json
{
    "parser": "svelte-eslint-parser",
    "parserOptions": {
        "parser": "@typescript-eslint/parser"
    }
}
```

## :computer: Editor Integrations

### Visual Studio Code

Use the [dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension that Microsoft provides officially.

You have to configure the `eslint.validate` option of the extension to check `.svelte` files, because the extension targets only `*.js` or `*.jsx` files by default.

Example **.vscode/settings.json**:

```json
{
    "eslint.validate": [
        "javascript",
        "javascriptreact",
        "svelte"
    ]
}
```

## Usage for Custom Rules / Plugins

- [AST.md](./docs/AST.md) is AST specification. You can check it on the [Online DEMO](https://ota-meshi.github.io/svelte-eslint-parser/).
- The parser will generate its own ScopeManager. You can check it on the [Online DEMO](https://ota-meshi.github.io/svelte-eslint-parser/scope).

## :beers: Contributing

Welcome contributing!

Please use GitHub's Issues/PRs.

## :lock: License

See the [LICENSE](LICENSE) file for license rights and limitations (MIT).

[Svelte]: https://svelte.dev/
[ESLint]: https://eslint.org/
[eslint-plugin-svelte3]: https://github.com/sveltejs/eslint-plugin-svelte3
