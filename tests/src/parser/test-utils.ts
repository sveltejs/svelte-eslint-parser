/* global require -- node */
import { VERSION as SVELTE_VERSION } from "svelte/compiler";
import path from "path";
import fs from "fs";
import semver from "semver";
import type { Linter, Scope as ESLintScope } from "eslint";
import { LinesAndColumns } from "../../../src/context";
import type { Reference, Scope, ScopeManager, Variable } from "eslint-scope";
import type * as TSESScopes from "@typescript-eslint/scope-manager";
import type { SvelteNode } from "../../../src/ast";
import type { StyleContext } from "../../../src";
import { TS_GLOBALS } from "./ts-vars";

const AST_FIXTURE_ROOT = path.resolve(__dirname, "../../fixtures/parser/ast");
const BASIC_PARSER_OPTIONS: Linter.ParserOptions = {
  ecmaVersion: 2020,
  parser: {
    ts: "@typescript-eslint/parser",
    typescript: require.resolve("@typescript-eslint/parser"),
  },
  project: require.resolve("../../fixtures/tsconfig.test.json"),
  extraFileExtensions: [".svelte"],
};

const SVELTE5_SCOPE_VARIABLES_BASE =  [
  {
    "name": "$$slots",
    "identifiers": [],
    "defs": [],
    "references": []
  },
  {
    "name": "$$props",
    "identifiers": [],
    "defs": [],
    "references": []
  },
  {
    "name": "$$restProps",
    "identifiers": [],
    "defs": [],
    "references": []
  },
  {
    "name": "$state",
    "identifiers": [],
    "defs": [],
    "references": []
  },
  {
    "name": "$derived",
    "identifiers": [],
    "defs": [],
    "references": []
  },
  {
    "name": "$effect",
    "identifiers": [],
    "defs": [],
    "references": []
  },
  {
    "name": "$props",
    "identifiers": [],
    "defs": [],
    "references": []
  }
]

export function generateParserOptions(
  ...options: Linter.ParserOptions[]
): Linter.ParserOptions {
  let result = { ...BASIC_PARSER_OPTIONS };
  for (const option of options) {
    result = { ...result, ...option };
  }
  return result;
}
export function* listupFixtures(dir?: string): Iterable<{
  input: string;
  inputFileName: string;
  outputFileName: string;
  scopeFileName: string;
  typeFileName: string | null;
  config: Linter.ParserOptions;
  requirements: {
    scope?: Record<string, string>;
  };
  getScopeFile: () => string | null;
  getRuleOutputFileName: (ruleName: string) => string;
  meetRequirements: (key: "test" | "scope" | "parse") => boolean;
}> {
  yield* listupFixturesImpl(dir || AST_FIXTURE_ROOT);
}

function getScopeFile(inputFileName: string, isSvelte5Only: boolean) {
  const scopeFileName = inputFileName.replace(
    /input\.svelte$/u,
    "scope-output.json",
  );
  if (!fs.existsSync(scopeFileName)) return null;
  const scopeFile = fs.readFileSync(scopeFileName, "utf8");
  if (!SVELTE_VERSION.startsWith("5") || isSvelte5Only) {
    return scopeFile;
  }

  const scopeFileJson = JSON.parse(scopeFile);
  const scopeFileNameSvelte5 = inputFileName.replace(
    /input\.svelte$/u,
    "scope-output-svelte5.json",
  );
  if (!fs.existsSync(scopeFileNameSvelte5)) {
    scopeFileJson["variables"] = SVELTE5_SCOPE_VARIABLES_BASE;
    return JSON.stringify(scopeFileJson, null, 2);
  }

  const scopeFileSvelte5 = fs.readFileSync(scopeFileNameSvelte5, "utf8");
  const scopeFileSvelte5Json = JSON.parse(scopeFileSvelte5);

  for (const key of Object.keys(scopeFileJson)) {
    if (scopeFileSvelte5Json[key]) {
      scopeFileJson[key] = scopeFileSvelte5Json[key];
    }
  }
  for (const key of Object.keys(scopeFileSvelte5Json)) {
    if (!scopeFileJson[key]) {
      scopeFileJson[key] = scopeFileSvelte5Json[key];
    }
  }

  return JSON.stringify(scopeFileJson, null, 2);
}

function* listupFixturesImpl(dir: string): Iterable<{
  input: string;
  inputFileName: string;
  outputFileName: string;
  scopeFileName: string;
  typeFileName: string | null;
  config: Linter.ParserOptions;
  requirements: {
    scope?: Record<string, string>;
  };
  getScopeFile: () => string | null;
  getRuleOutputFileName: (ruleName: string) => string;
  meetRequirements: (key: "test" | "scope" | "parse") => boolean;
}> {
  for (const filename of fs.readdirSync(dir)) {
    const inputFileName = path.join(dir, filename);

    const isSvelte5Only = inputFileName.includes("/svelte5/");
    if (isSvelte5Only && !SVELTE_VERSION.startsWith("5")) {
      continue;
    }

    if (filename.endsWith("input.svelte")) {
      const outputFileName = inputFileName.replace(
        /input\.svelte$/u,
        "output.json",
      );
      const scopeFileName = inputFileName.replace(
        /input\.svelte$/u,
        "scope-output.json",
      );
      const typeFileName = inputFileName.replace(
        /input\.svelte$/u,
        "type-output.svelte",
      );
      const configFileName = inputFileName.replace(
        /input\.svelte$/u,
        "config.json",
      );
      const requirementsFileName = inputFileName.replace(
        /input\.svelte$/u,
        "requirements.json",
      );

      const input = fs.readFileSync(inputFileName, "utf8");
      const requirements = fs.existsSync(requirementsFileName)
        ? JSON.parse(fs.readFileSync(requirementsFileName, "utf-8"))
        : {};
      const config = fs.existsSync(configFileName)
        ? JSON.parse(fs.readFileSync(configFileName, "utf-8"))
        : {};
      yield {
        input,
        inputFileName,
        outputFileName,
        scopeFileName,
        typeFileName: fs.existsSync(typeFileName) ? typeFileName : null,
        config,
        requirements,
        getScopeFile: () => getScopeFile(inputFileName, isSvelte5Only),
        getRuleOutputFileName: (ruleName) => {
          return inputFileName.replace(
            /input\.svelte$/u,
            `${ruleName}-result.json`,
          );
        },
        meetRequirements(key) {
          const obj = requirements[key];
          if (obj) {
            if (
              Object.entries(obj).some(([pkgName, pkgVersion]) => {
                // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- ignore
                const pkg = require(`${pkgName}/package.json`);
                return !semver.satisfies(pkg.version, pkgVersion as string);
              })
            ) {
              return false;
            }
          }
          return true;
        },
      };
    }
    if (
      fs.existsSync(inputFileName) &&
      fs.statSync(inputFileName).isDirectory()
    ) {
      yield* listupFixturesImpl(inputFileName);
    }
  }
}

export function getMessageData(
  code: string,
  message: Linter.LintMessage,
): {
  ruleId: string | null;
  code: string;
  message?: string;
  line: number;
  column: number;
} {
  const linesAndColumns = new LinesAndColumns(code);
  const start = linesAndColumns.getIndexFromLoc({
    line: message.line,
    column: message.column - 1,
  });
  let end: number;
  if (message.endLine != null) {
    end = linesAndColumns.getIndexFromLoc({
      line: message.endLine,
      column: message.endColumn! - 1,
    });
  } else {
    end = start + 1;
  }
  if (message.ruleId == null) {
    return {
      ruleId: message.ruleId,
      message: message.message,
      code: code.slice(start, end),
      line: message.line,
      column: message.column,
    };
  }
  return {
    ruleId: message.ruleId,
    code: code.slice(start, end),
    line: message.line,
    column: message.column,
  };
}

export function astToJson(node: any): string {
  return JSON.stringify(node, nodeReplacer, 2);
}

export function scopeToJSON(
  scopeManager: ScopeManager | TSESScopes.ScopeManager,
  option?: { skipGlobalScope?: boolean },
): string {
  const globalScope = scopeManager.globalScope!;
  let scopeData;
  if (option?.skipGlobalScope) {
    scopeData =
      globalScope.childScopes.length === 1
        ? normalizeScope(globalScope.childScopes[0])
        : globalScope.childScopes.map(normalizeScope);
  } else {
    scopeData = normalizeScope(globalScope);
  }
  return JSON.stringify(scopeData, nodeReplacer, 2);
}

export function styleContextToJson(styleContext: StyleContext): string {
  const normalized = new Set<any>();
  return JSON.stringify(styleContext, nodeReplacer, 2);

  function nodeReplacer(key: string, value: any): any {
    if (key === "file" || key === "url") {
      return undefined;
    }
    return normalizePostcssObject(value);
  }

  function normalizePostcssObject(
    value: any,
    defaultCompare = (_a: string, _b: string) => 0,
  ) {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      normalized.has(value)
    ) {
      return value;
    }
    let compare = defaultCompare;
    if (value.sourceLang && typeof value.sourceLang === "string") {
      // It is context
      const order = ["status", "sourceLang", "sourceAst", "error"];
      compare = (a, b) => compareOrder(a, b, order);
    } else if (typeof value.type === "string") {
      // It is node
      compare = (a, b) =>
        nodeFirsts(a, value.type) - nodeFirsts(b, value.type) ||
        nodeLasts(a, value.type) - nodeLasts(b, value.type);
      if (value.raws && typeof value.raws === "object") {
        const order = ["before", "between", "semicolon", "after"];
        value.raws = normalizePostcssObject(value.raws, (a, b) =>
          compareOrder(a, b, order),
        );
      }
    } else if (
      typeof value.reason === "string" &&
      typeof value.name === "string"
    ) {
      // It is error
      const order = [
        "name",
        "reason",
        "source",
        "line",
        "column",
        "endLine",
        "endColumn",
        "input",
      ];
      compare = (a, b) => order.indexOf(a) - order.indexOf(b);
    } else if (
      typeof value.line === "number" &&
      typeof value.column === "number"
    ) {
      // It is location
      const order = ["line", "column", "offset", "endLine", "endColumn"];
      compare = (a, b) => compareOrder(a, b, order);
    } else if (typeof value.hasBOM === "boolean") {
      // It is inputs
      const order = ["hasBOM", "css"];
      compare = (a, b) => compareOrder(a, b, order);
    }

    function nodeFirsts(k: string, _nodeType: string | null) {
      const o = ["raws", "type"].indexOf(k);
      return o === -1 ? Infinity : o;
    }

    function nodeLasts(k: string, _nodeType: string | null) {
      return ["source", "lastEach", "indexes", "inputs"].indexOf(k);
    }

    function compareOrder(a: string, b: string, order: string[]) {
      const oA = order.includes(a) ? order.indexOf(a) : Infinity;
      const oB = order.includes(b) ? order.indexOf(b) : Infinity;
      return oA - oB;
    }

    const entries = Object.entries(value);

    const result = Object.fromEntries(
      entries.sort(([a], [b]) => {
        const c = compare(a, b);
        if (c) {
          return c;
        }
        return a < b ? -1 : a > b ? 1 : 0;
      }),
    );
    normalized.add(result);
    return result;
  }
}

function normalizeScope(scope: Scope | TSESScopes.Scope): any {
  let variables = scope.variables as TSESScopes.Variable[];
  if (scope.type === "global") {
    // Exclude well-known variables as they do not need to be tested.
    variables = variables.filter((v) => !TS_GLOBALS.includes(v.name));
  }
  return {
    type: scope.type,
    variables: variables.map(normalizeVar),
    references: scope.references.map(normalizeReference),
    childScopes: scope.childScopes.map(normalizeScope),
    through: scope.through.map(normalizeReference),
  };
}

function normalizeVar(v: Variable | TSESScopes.Variable) {
  return {
    name: v.name,
    identifiers: v.identifiers,
    defs: v.defs.map(normalizeDef),
    references: v.references.map(normalizeReference),
  };
}

function normalizeReference(reference: Reference | TSESScopes.Reference) {
  return {
    identifier: reference.identifier,
    from: reference.from.type,
    resolved: reference.resolved?.defs?.[0]?.name ?? null,
    init: reference.init ?? null,
  };
}

function normalizeDef(
  reference: ESLintScope.Definition | TSESScopes.Definition,
) {
  return {
    type: reference.type,
    node: reference.node,
    name: reference.name,
  };
}

export function normalizeError(error: any): any {
  return {
    message: error.message,
    index: error.index,
    lineNumber: error.lineNumber,
    column: error.column,
  };
}

/* eslint-disable complexity -- ignore */
/**
 * Remove `parent` properties from the given AST.
 */
function nodeReplacer(
  /* eslint-enable complexity -- ignore */
  key: string,
  value: any,
): any {
  if (key === "parent") {
    return undefined;
  }
  if (
    (key === "assertions" || key === "decorators") &&
    Array.isArray(value) &&
    value.length === 0
  ) {
    // Node types changed in typescript-eslint v6.
    return undefined;
  }
  if ((key === "definite" || key === "declare") && value === false) {
    // Node types changed in typescript-eslint v6.
    return undefined;
  }

  if (value instanceof RegExp) {
    return String(value);
  }
  if (typeof value === "bigint") {
    return null; // Make it null so it can be checked on node8.
    // return `${String(value)}n`
  }
  let obj = value;
  if (obj) {
    if (
      (obj.type === "Identifier" ||
        obj.type === "Property" ||
        obj.type === "ObjectPattern" ||
        obj.type === "AssignmentPattern") &&
      obj.optional === false
    ) {
      // Node types changed in typescript-eslint v6.
      obj = { ...obj };
      delete obj.optional;
    }
    if (
      (obj.type === "TSTypeReference" || obj.type === "CallExpression") &&
      obj.typeParameters
    ) {
      // Node types changed in typescript-eslint v6.
      const copy = { ...obj };
      copy.typeArguments = obj.typeParameters;
      delete copy.typeParameters;
      obj = copy;
    }
    if (obj.type === "TSPropertySignature") {
      // Node types changed in typescript-eslint v6.
      obj = { ...obj };
      for (const k of ["optional", "readonly", "static"]) {
        if (obj[k] === false) {
          delete obj[k];
        }
      }
    }
  }
  return normalizeObject(obj);
}

type SvelteKeysType<T extends SvelteNode = SvelteNode> = {
  [key in SvelteNode["type"]]: T extends { type: key }
    ? KeyofObject<T>[]
    : never;
};
type KeyofObject<T> = { [key in keyof T]: key }[keyof T];
const nodeToKeys: SvelteKeysType = {
  Program: ["body", "sourceType", "comments", "tokens"],
  SvelteAttribute: ["key", "boolean", "value"],
  SvelteAwaitBlock: ["expression", "pending", "then", "catch"],
  SvelteAwaitCatchBlock: ["awaitCatch", "error", "children"],
  SvelteAwaitPendingBlock: ["children"],
  SvelteAwaitThenBlock: ["awaitThen", "value", "children"],
  SvelteDebugTag: ["identifiers"],
  SvelteConstTag: ["declaration"],
  SvelteDirective: ["key", "intro", "outro", "expression"],
  SvelteStyleDirective: ["key", "shorthand", "value"],
  SvelteDirectiveKey: ["name", "modifiers"],
  SvelteEachBlock: [
    "expression",
    "context",
    "index",
    "key",
    "children",
    "else",
  ],
  SvelteElement: ["kind", "name", "startTag", "children", "endTag"],
  SvelteElseBlock: ["elseif", "children"],
  SvelteEndTag: [],
  SvelteHTMLComment: ["value"],
  SvelteIfBlock: ["elseif", "expression", "children", "else"],
  SvelteKeyBlock: ["expression", "children"],
  SvelteLiteral: ["value"],
  SvelteMustacheTag: ["kind", "expression"],
  SvelteName: ["name"],
  SvelteMemberExpressionName: ["object", "property"],
  SvelteReactiveStatement: ["label", "body"],
  SvelteScriptElement: ["name", "startTag", "body", "endTag"],
  SvelteShorthandAttribute: ["key", "value"],
  SvelteSpecialDirective: ["kind", "key", "expression"],
  SvelteSpecialDirectiveKey: [],
  SvelteSpreadAttribute: ["argument"],
  SvelteStartTag: ["attributes", "selfClosing"],
  SvelteStyleElement: ["name", "startTag", "children", "endTag"],
  SvelteText: ["value"],
};

function normalizeObject(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const isNode =
    typeof value.type === "string" &&
    (typeof value.start === "number" || typeof value.range?.[0] === "number");

  function firsts(k: string, nodeType: string | null) {
    const o = [
      "type",
      "kind",
      "name",
      ...((nodeType != null && nodeToKeys[nodeType as keyof SvelteKeysType]) ||
        []),
      // scope
      "identifier",
      "from",
      "variables",
      "identifiers",
      "defs",
      "references",
      "childScopes",
    ].indexOf(k);

    return o === -1 ? Infinity : o;
  }

  function lasts(k: string, _nodeType: string | null) {
    return [
      // locs
      "start",
      "end",
      "line",
      "column",
      //
      "range",
      "loc",
    ].indexOf(k);
  }

  let entries = Object.entries(value);
  if (isNode) {
    entries = entries.filter(
      ([k]) => k !== "parent" && k !== "start" && k !== "end",
    );
  }
  const nodeType: string | null = isNode ? value.type : null;

  return Object.fromEntries(
    entries.sort(([a], [b]) => {
      const c =
        firsts(a, nodeType) - firsts(b, nodeType) ||
        lasts(a, nodeType) - lasts(b, nodeType);
      if (c) {
        return c;
      }
      return a < b ? -1 : a > b ? 1 : 0;
    }),
  );
}

export function sortJson(pJson: any): any {
  function tryParse(): { isJson: boolean; json: any | null } {
    if (Array.isArray(pJson) || typeof pJson === "object") {
      return { isJson: true, json: pJson };
    }
    try {
      const json = JSON.parse(pJson);
      return { isJson: true, json };
    } catch {
      return { isJson: false, json: null };
    }
  }

  const { isJson, json } = tryParse();
  if (!isJson) return pJson;
  if (Array.isArray(json)) {
    return json.map(sortJson);
  }
  if (json && typeof json === "object") {
    const result: any = {};
    for (const key of Object.keys(json).sort()) {
      result[key] = sortJson(json[key]);
    }
    return result;
  }
  return json;
}
