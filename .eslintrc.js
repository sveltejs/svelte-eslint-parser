"use strict"

// const version = require("./package.json").version

module.exports = {
    parserOptions: {
        sourceType: "script",
        ecmaVersion: 2020,
    },
    extends: [
        "plugin:@ota-meshi/recommended",
        "plugin:@ota-meshi/+node",
        "plugin:@ota-meshi/+typescript",
        "plugin:@ota-meshi/+prettier",
        "plugin:@ota-meshi/+package-json",
        "plugin:@ota-meshi/+json",
    ],
    rules: {
        "require-jsdoc": "error",
        "no-warning-comments": "warn",
        "no-lonely-if": "off",
        "no-shadow": "off",
    },
    overrides: [
        {
            files: ["*.ts"],
            parser: "@typescript-eslint/parser",
            parserOptions: {
                sourceType: "module",
                project: "./tsconfig.json",
            },
            rules: {
                "@typescript-eslint/naming-convention": [
                    "error",
                    {
                        selector: "default",
                        format: ["camelCase"],
                        leadingUnderscore: "allow",
                        trailingUnderscore: "allow",
                    },
                    {
                        selector: "variable",
                        format: ["camelCase", "UPPER_CASE"],
                        leadingUnderscore: "allow",
                        trailingUnderscore: "allow",
                    },
                    {
                        selector: "typeLike",
                        format: ["PascalCase"],
                    },
                    {
                        selector: "property",
                        format: null,
                    },
                    {
                        selector: "method",
                        format: null,
                    },
                ],
                "no-implicit-globals": "off",
                "@typescript-eslint/no-non-null-assertion": "off",
                "@typescript-eslint/no-use-before-define": "off",
                "@typescript-eslint/no-explicit-any": "off",
            },
        },
        {
            files: ["scripts/**/*.ts", "tests/**/*.ts"],
            rules: {
                "require-jsdoc": "off",
                "no-console": "off",
            },
        },
    ],
}
