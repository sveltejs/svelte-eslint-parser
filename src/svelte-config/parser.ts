import type { StaticSvelteConfig } from ".";
import { getEspree } from "../parser/espree";
import type {
  Program,
  ExportDefaultDeclaration,
  Expression,
  Identifier,
} from "estree";
import { getFallbackKeys, traverseNodes } from "../traverse";
import type { ScopeManager } from "eslint-scope";
import { analyze } from "eslint-scope";
import { findVariable } from "../scope";

export function parseConfig(code: string): StaticSvelteConfig | null {
  const espree = getEspree();
  const ast = espree.parse(code, {
    range: true,
    loc: true,
    ecmaVersion: espree.latestEcmaVersion,
    sourceType: "module",
  });
  // Set parent nodes.
  traverseNodes(ast, {
    enterNode(node, parent) {
      (node as any).parent = parent;
    },
    leaveNode() {
      /* do nothing */
    },
  });
  // Analyze scopes.
  const scopeManager = analyze(ast, {
    ignoreEval: true,
    nodejsScope: false,
    ecmaVersion: espree.latestEcmaVersion,
    sourceType: "module",
    fallback: getFallbackKeys,
  });
  return parseAst(ast, scopeManager);
}

const enum EvaluatedType {
  literal,
  object,
}

type Evaluated =
  | {
      type: EvaluatedType.literal;
      value: string | number | bigint | boolean | null | undefined | RegExp;
    }
  | {
      type: EvaluatedType.object;
      properties: EvaluatedProperties;
    };

class EvaluatedProperties {
  private readonly cached = new Map<string, Evaluated | null>();

  private readonly getter: (key: string) => Evaluated | null;

  public constructor(getter: (key: string) => Evaluated | null) {
    this.getter = getter;
  }

  public get(key: string): Evaluated | null {
    if (this.cached.has(key)) return this.cached.get(key) || null;
    const value = this.getter(key);
    this.cached.set(key, value);
    return value;
  }
}

function parseAst(
  ast: Program,
  scopeManager: ScopeManager,
): StaticSvelteConfig {
  const edd = ast.body.find(
    (node): node is ExportDefaultDeclaration =>
      node.type === "ExportDefaultDeclaration",
  );
  if (!edd) return {};
  const decl = edd.declaration;
  if (decl.type === "ClassDeclaration" || decl.type === "FunctionDeclaration")
    return {};
  return parseSvelteConfigExpression(decl, scopeManager);
}

function parseSvelteConfigExpression(
  node: Expression,
  scopeManager: ScopeManager,
): StaticSvelteConfig {
  const tracked = new Map<Identifier, Expression | null>();
  const parsed = parseExpression(node);
  if (parsed?.type !== EvaluatedType.object) return {};
  const properties = parsed.properties;
  const result: StaticSvelteConfig = {};
  // Returns only known properties.
  const compilerOptions = properties.get("compilerOptions");
  if (compilerOptions?.type === EvaluatedType.object) {
    result.compilerOptions = {};
    const runes = compilerOptions.properties.get("runes");
    if (
      runes?.type === EvaluatedType.literal &&
      typeof runes.value === "boolean"
    ) {
      result.compilerOptions.runes = runes.value;
    }
  }
  const kit = properties.get("kit");
  if (kit?.type === EvaluatedType.object) {
    result.kit = {};
    const kitFiles = kit.properties.get("files");
    if (kitFiles?.type === EvaluatedType.object) {
      result.kit.files = {};
      const kitFilesRoutes = kitFiles.properties.get("routes");
      if (
        kitFilesRoutes?.type === EvaluatedType.literal &&
        typeof kitFilesRoutes.value === "string"
      ) {
        result.kit.files.routes = kitFilesRoutes.value;
      }
    }
  }
  return result;

  function parseExpression(node: Expression): Evaluated | null {
    if (node.type === "Literal") {
      return { type: EvaluatedType.literal, value: node.value };
    }
    if (node.type === "Identifier") {
      const expr = trackIdentifier(node);
      if (!expr) return null;
      return parseExpression(expr);
    }
    if (node.type === "ObjectExpression") {
      const reversedProperties = [...node.properties].reverse();
      return {
        type: EvaluatedType.object,
        properties: new EvaluatedProperties((key) => {
          for (const prop of reversedProperties) {
            if (prop.type === "Property") {
              if (
                !prop.computed &&
                prop.key.type === "Identifier" &&
                prop.key.name === key
              ) {
                return parseExpression(prop.value as Expression);
              }
              const evaluatedKey = parseExpression(prop.key as Expression);
              if (
                evaluatedKey?.type === EvaluatedType.literal &&
                String(evaluatedKey.value) === key
              ) {
                return parseExpression(prop.value as Expression);
              }
            } else if (prop.type === "SpreadElement") {
              const nesting = parseExpression(prop.argument);
              if (nesting?.type === EvaluatedType.object) {
                const value = nesting.properties.get(key);
                if (value) return value;
              }
            }
          }
          return null;
        }),
      };
    }

    return null;
  }

  function trackIdentifier(node: Identifier): Expression | null {
    if (tracked.has(node)) return tracked.get(node) || null;
    tracked.set(node, null);
    const variable = findVariable(scopeManager, node);
    if (!variable || variable.defs.length !== 1) return null;
    const def = variable.defs[0];
    if (def.type !== "Variable" || def.parent.kind !== "const") return null;
    const init = def.node.init || null;
    tracked.set(node, init);
    return init;
  }
}
