import fs from "fs";
import path from "path";
import {
  isTSESLintParserObject,
  maybeTSESLintParserObject,
} from "./parser-object.js";
import { getParserForLang, type UserOptionParser } from "./resolve-parser.js";

export type NormalizedParserOptions = {
  parser?: UserOptionParser;
  project?: string | string[] | null;

  ecmaVersion: number | "latest";
  sourceType: "module" | "script";
  ecmaFeatures?: {
    globalReturn?: boolean | undefined;
    impliedStrict?: boolean | undefined;
    jsx?: boolean | undefined;
    experimentalObjectRestSpread?: boolean | undefined;
    [key: string]: any;
  };
  svelteFeatures?: {
    // This option is for Svelte 5. The default value is `true`.
    // If `false`, ESLint will not recognize rune symbols.
    // If not configured this option, The parser will try to read the option from `compilerOptions.runes` from `svelte.config.js`.
    // If `parserOptions.svelteConfig` is not specified and the file cannot be parsed by static analysis, it will behave as `true`.
    runes?: boolean;
  };
  loc: boolean;
  range: boolean;
  raw: boolean;
  tokens: boolean;
  comment: boolean;
  eslintVisitorKeys: boolean;
  eslintScopeManager: boolean;
  filePath?: string;
};

/** Normalize parserOptions */
export function normalizeParserOptions(options: any): NormalizedParserOptions {
  const parserOptions = {
    ecmaVersion: 2020,
    sourceType: "module",
    loc: true,
    range: true,
    raw: true,
    tokens: true,
    comment: true,
    eslintVisitorKeys: true,
    eslintScopeManager: true,
    ...(options || {}),
  };
  parserOptions.sourceType = "module";
  if (parserOptions.ecmaVersion <= 5 || parserOptions.ecmaVersion == null) {
    parserOptions.ecmaVersion = 2015;
  }

  return parserOptions;
}

const TS_PARSER_NAMES = [
  "@typescript-eslint/parser",
  "typescript-eslint-parser-for-extra-files",
];

export function getLanguage(
  parserOptions: NormalizedParserOptions,
  lang: string | undefined,
  code: string | undefined,
): "js" | "ts" | "jsdoc" | string {
  const hasJsDoc = code ? jsdocTags.some((tag) => tag.test(code)) : false;
  if (!lang && !hasJsDoc) {
    return "js";
  }

  function getFinalLang(isTS: boolean): string {
    if (isTS) {
      if (lang) return lang;
      return hasJsDoc ? "jsdoc" : "ts";
    }
    return lang || "js";
  }

  const parserValue = getParserForLang(
    lang || (hasJsDoc ? "ts" : undefined),
    parserOptions?.parser,
  );
  if (typeof parserValue !== "string") {
    const isTS =
      maybeTSESLintParserObject(parserValue) ||
      isTSESLintParserObject(parserValue);
    return getFinalLang(isTS);
  }
  const parserName = parserValue;
  if (TS_PARSER_NAMES.includes(parserName)) {
    return getFinalLang(true);
  }
  if (TS_PARSER_NAMES.some((nm) => parserName.includes(nm))) {
    let targetPath = parserName;
    while (targetPath) {
      const pkgPath = path.join(targetPath, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const isTS = TS_PARSER_NAMES.includes(
            JSON.parse(fs.readFileSync(pkgPath, "utf-8"))?.name,
          );
          return getFinalLang(isTS);
        } catch {
          return getFinalLang(false);
        }
      }
      const parent = path.dirname(targetPath);
      if (targetPath === parent) {
        break;
      }
      targetPath = parent;
    }
  }

  return getFinalLang(false);
}

const jsdocTags = [
  /@type\s/,
  /@param\s/,
  /@arg\s/,
  /@argument\s/,
  /@returns\s/,
  /@return\s/,
  /@typedef\s/,
  /@callback\s/,
  /@template\s/,
  /@class\s/,
  /@constructor\s/,
  /@this\s/,
  /@extends\s/,
  /@augments\s/,
  /@enum\s/,
] as const;
