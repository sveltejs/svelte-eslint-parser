# svelte-eslint-parser

[Svelte] parser for [ESLint].  
You can check it on [Online DEMO](https://sveltejs.github.io/svelte-eslint-parser/playground).

[![NPM license](https://img.shields.io/npm/l/svelte-eslint-parser.svg)](https://www.npmjs.com/package/svelte-eslint-parser)
[![NPM version](https://img.shields.io/npm/v/svelte-eslint-parser.svg)](https://www.npmjs.com/package/svelte-eslint-parser)
[![NPM downloads](https://img.shields.io/badge/dynamic/json.svg?label=downloads&colorB=green&suffix=/day&query=$.downloads&uri=https://api.npmjs.org//downloads/point/last-day/svelte-eslint-parser&maxAge=3600)](http://www.npmtrends.com/svelte-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dw/svelte-eslint-parser.svg)](http://www.npmtrends.com/svelte-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dm/svelte-eslint-parser.svg)](http://www.npmtrends.com/svelte-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dy/svelte-eslint-parser.svg)](http://www.npmtrends.com/svelte-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dt/svelte-eslint-parser.svg)](http://www.npmtrends.com/svelte-eslint-parser)
[![Build Status](https://github.com/sveltejs/svelte-eslint-parser/workflows/CI/badge.svg?branch=main)](https://github.com/sveltejs/svelte-eslint-parser/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/sveltejs/svelte-eslint-parser/badge.svg?branch=main)](https://coveralls.io/github/sveltejs/svelte-eslint-parser?branch=main)

## ⤴️ Motivation

The [svelte-eslint-parser] aims to make it easy to create your own ESLint rules for [Svelte].

The [`eslint-plugin-svelte`] is an ESLint plugin that uses the [svelte-eslint-parser]. I have already [implemented some rules].

[`eslint-plugin-svelte`]: https://github.com/sveltejs/eslint-plugin-svelte
[implemented some rules]: https://sveltejs.github.io/eslint-plugin-svelte/rules/

### ESLint Plugins Using svelte-eslint-parser

#### [eslint-plugin-svelte](https://sveltejs.github.io/eslint-plugin-svelte/)

ESLint plugin for Svelte.  
It provides many unique check rules by using the template AST.

#### [@intlify/eslint-plugin-svelte](https://github.com/intlify/eslint-plugin-svelte)

ESLint plugin for internationalization (i18n) with Svelte.  
It provides rules to help internationalization your application created with Svelte.

## ❗ Attention

The [svelte-eslint-parser] can not be used with the [eslint-plugin-svelte3].

[svelte-eslint-parser]: https://github.com/sveltejs/svelte-eslint-parser

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

For example, if you are using the `"@typescript-eslint/parser"`, and if you want to use TypeScript in `<script>` of `.svelte`, you need to add more `parserOptions` configuration.

```js
module.exports = {
  // ...
  parser: "@typescript-eslint/parser",
  parserOptions: {
    // ...
    project: "path/to/your/tsconfig.json",
    extraFileExtensions: [".svelte"], // This is a required setting in `@typescript-eslint/parser` v4.24.0.
  },
  overrides: [
    {
      files: ["*.svelte"],
      parser: "svelte-eslint-parser",
      // Parse the `<script>` in `.svelte` as TypeScript by adding the following configuration.
      parserOptions: {
        parser: "@typescript-eslint/parser",
      },
    },
    // ...
  ],
  // ...
}
```

#### Multiple parsers

If you want to switch the parser for each lang, specify the object.

```json
{
    "parser": "svelte-eslint-parser",
    "parserOptions": {
        "parser": {
            "ts": "@typescript-eslint/parser",
            "js": "espree",
            "typescript": "@typescript-eslint/parser"
        }
    }
}
```

#### Parser Object

When using JavaScript configuration (`.eslintrc.js`), you can also give the parser object directly.

```js
const tsParser = require("@typescript-eslint/parser")
const espree = require("espree")

module.exports = {
    parser: "svelte-eslint-parser",
    parserOptions: {
        // Single parser
        parser: tsParser,
        // Multiple parser
        parser: {
            js: espree,
            ts: tsParser,
        }
    },
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

- [AST.md](./docs/AST.md) is AST specification. You can check it on the [Online DEMO](https://sveltejs.github.io/svelte-eslint-parser/).
- The parser will generate its own [ScopeManager](https://eslint.org/docs/developer-guide/scope-manager-interface). You can check it on the [Online DEMO](https://sveltejs.github.io/svelte-eslint-parser/scope).
- I have already [implemented some rules] in the [`eslint-plugin-svelte`]. The source code for these rules will be helpful to you.

## :beers: Contributing

Welcome contributing!

Please use GitHub's Issues/PRs.

See also the documentation for the internal mechanism.  

- [internal-mechanism.md](./docs/internal-mechanism.md)

## :lock: License

See the [LICENSE](LICENSE) file for license rights and limitations (MIT).

[Svelte]: https://svelte.dev/
[ESLint]: https://eslint.org/
[eslint-plugin-svelte3]: https://github.com/sveltejs/eslint-plugin-svelte3
