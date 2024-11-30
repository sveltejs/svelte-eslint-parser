import * as myPlugin from "@ota-meshi/eslint-plugin";
import globals from "globals";

export default [
  {
    ignores: [
      ".nyc_output",
      "coverage",
      "lib",
      "node_modules",
      "tests/fixtures/**/*.json",
      "tests/fixtures/**/*.svelte",
      "tests/fixtures/**/*.js",
      "tests/fixtures/**/*.ts",
      "explorer/dist",
      "explorer/node_modules",
      "explorer-v2/build",
      "explorer-v2/build",
      "explorer-v2/build-system/shim/svelte-eslint-parser.*",
      "explorer-v2/build-system/shim/eslint-scope.*",
      "explorer-v2/build-system/shim/eslint.*",
      "explorer-v2/build-system/shim/svelte/*",
      "!.vscode",
      "!.github",
      "explorer-v2/.svelte-kit",
      ".changeset/pre.json",
    ],
  },
  ...myPlugin.config({
    node: true,
    ts: true,
    json: true,
    packageJson: true,
    yaml: true,
    prettier: true,
  }),
  {
    languageOptions: {
      sourceType: "module",
    },

    rules: {
      "no-lonely-if": "off",
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "off",
      "no-warning-comments": "warn",
      "jsdoc/require-jsdoc": "off",
      complexity: "off",

      "prettier/prettier": [
        "error",
        {},
        {
          usePrettierrc: true,
        },
      ],
    },
  },
  {
    files: ["**/*.ts"],

    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
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
        {
          selector: "import",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
        },
      ],

      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-implicit-globals": "off",

      "no-void": [
        "error",
        {
          allowAsStatement: true,
        },
      ],
    },
  },
  {
    files: ["scripts/**/*.ts", "tests/**/*.ts"],

    rules: {
      "no-console": "off",
      "jsdoc/require-jsdoc": "off",
    },
  },

  ...myPlugin
    .config({
      prettier: true,
      svelte: true,
    })
    .map(async (config) => ({
      ...(await config),
      files: ["explorer-v2/**/*.svelte"],
    })),
  {
    files: ["explorer-v2/**/*.{svelte,js}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "eslint-comments/no-unused-disable": "off",
      "n/no-missing-import": "off",
      "n/no-unpublished-require": "off",
      "n/no-unpublished-import": "off",
      "n/no-unsupported-features/es-syntax": "off",
      "n/no-unsupported-features/node-builtins": "off",
      "require-jsdoc": "off",
      "n/file-extension-in-import": "off",

      "prettier/prettier": [
        "error",
        {},
        {
          usePrettierrc: true,
        },
      ],

      "no-shadow": "off",
      camelcase: "off",
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "spaced-comment": "off",
    },
  },
];
