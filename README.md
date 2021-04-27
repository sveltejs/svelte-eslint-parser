# svelte-eslint-parser

[Svelte] parser for [ESLint]

***Works In Progress***  
***This parser is still in an EXPERIMENTAL STATE***

## ❓ Why?

[Svelte] has the official ESLint plugin [eslint-plugin-svelte3]. [eslint-plugin-svelte3] works well enough to check scripts. However, it does not handle the AST of the template, which makes it very difficult for third parties to create their own [ESLint] rules for [Svelte].

The `svelte-eslint-parser` aims to make it easy to create your own rules for [Svelte] by allowing the template AST to be used in the rules.

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

## :beers: Contributing

Welcome contributing!

Please use GitHub's Issues/PRs.

## :lock: License

See the [LICENSE](LICENSE) file for license rights and limitations (MIT).

[Svelte]: https://svelte.dev/
[ESLint]: https://eslint.org/
[eslint-plugin-svelte3]: https://github.com/sveltejs/eslint-plugin-svelte3
