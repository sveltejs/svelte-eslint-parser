import fs from "fs";
import path from "path";
import {
  isTSESLintParserObject,
  maybeTSESLintParserObject,
} from "./parser-object";
import { getParserForLang, type UserOptionParser } from "./resolve-parser";

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

export function isTypeScript(
  parserOptions: NormalizedParserOptions,
  lang: string | undefined,
): boolean {
  if (!lang) {
    return false;
  }
  const parserValue = getParserForLang(lang, parserOptions?.parser);
  if (typeof parserValue !== "string") {
    return (
      maybeTSESLintParserObject(parserValue) ||
      isTSESLintParserObject(parserValue)
    );
  }
  const parserName = parserValue;
  if (TS_PARSER_NAMES.includes(parserName)) {
    return true;
  }
  if (TS_PARSER_NAMES.some((nm) => parserName.includes(nm))) {
    let targetPath = parserName;
    while (targetPath) {
      const pkgPath = path.join(targetPath, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          return TS_PARSER_NAMES.includes(
            JSON.parse(fs.readFileSync(pkgPath, "utf-8"))?.name,
          );
        } catch {
          return false;
        }
      }
      const parent = path.dirname(targetPath);
      if (targetPath === parent) {
        break;
      }
      targetPath = parent;
    }
  }

  return false;
}
