import type { StaticSvelteConfig } from ".";
import type * as ESTree from "estree";
import type { Scope } from "eslint";
import type { ScopeManager } from "eslint-scope";
import { getFallbackKeys, traverseNodes } from "../traverse";
import { getEspree } from "../parser/espree";
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
  ast: ESTree.Program,
  scopeManager: ScopeManager,
): StaticSvelteConfig {
  const edd = ast.body.find(
    (node): node is ESTree.ExportDefaultDeclaration =>
      node.type === "ExportDefaultDeclaration",
  );
  if (!edd) return {};
  const decl = edd.declaration;
  if (decl.type === "ClassDeclaration" || decl.type === "FunctionDeclaration")
    return {};
  return parseSvelteConfigExpression(decl, scopeManager);
}

function parseSvelteConfigExpression(
  node: ESTree.Expression,
  scopeManager: ScopeManager,
): StaticSvelteConfig {
  const tracked = new Map<ESTree.Identifier, Scope.Definition | null>();
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

  function parseExpression(node: ESTree.Expression): Evaluated | null {
    if (node.type === "Literal") {
      return { type: EvaluatedType.literal, value: node.value };
    }
    if (node.type === "Identifier") {
      return parseIdentifier(node);
    }
    if (node.type === "ObjectExpression") {
      const reversedProperties = [...node.properties].reverse();
      return {
        type: EvaluatedType.object,
        properties: new EvaluatedProperties((key) => {
          let hasUnknown = false;
          for (const prop of reversedProperties) {
            if (prop.type === "Property") {
              if (!prop.computed && prop.key.type === "Identifier") {
                if (prop.key.name === key)
                  return parseExpression(prop.value as ESTree.Expression);
              } else {
                const evaluatedKey = parseExpression(
                  prop.key as ESTree.Expression,
                );
                if (evaluatedKey?.type === EvaluatedType.literal) {
                  if (String(evaluatedKey.value) === key)
                    return parseExpression(prop.value as ESTree.Expression);
                } else {
                  hasUnknown = true;
                }
              }
            } else if (prop.type === "SpreadElement") {
              hasUnknown = true;
              const nesting = parseExpression(prop.argument);
              if (nesting?.type === EvaluatedType.object) {
                const value = nesting.properties.get(key);
                if (value) return value;
              }
            }
          }
          return hasUnknown
            ? null
            : { type: EvaluatedType.literal, value: undefined };
        }),
      };
    }

    return null;
  }

  function parseIdentifier(node: ESTree.Identifier) {
    const def = getIdentifierDefinition(node);
    if (!def) return null;
    if (def.type !== "Variable") return null;
    if (def.parent.kind !== "const" || !def.node.init) return null;
    const evaluated = parseExpression(def.node.init);
    if (!evaluated) return null;
    const assigns = parsePatternAssign(def.name, def.node.id);
    let result = evaluated;
    while (assigns.length) {
      const assign = assigns.shift()!;
      if (assign.type === "member") {
        if (result.type !== EvaluatedType.object) return null;
        const next = result.properties.get(assign.name);
        if (!next) return null;
        result = next;
      } else if (assign.type === "assignment") {
        if (
          result.type === EvaluatedType.literal &&
          result.value === undefined
        ) {
          const next = parseExpression(assign.node.right);
          if (!next) return null;
          result = next;
        }
      }
    }
    return result;
  }

  function getIdentifierDefinition(
    node: ESTree.Identifier,
  ): Scope.Definition | null {
    if (tracked.has(node)) return tracked.get(node) || null;
    tracked.set(node, null);
    const variable = findVariable(scopeManager, node);
    if (!variable || variable.defs.length !== 1) return null;
    const def = variable.defs[0];
    tracked.set(node, def);
    if (
      def.type !== "Variable" ||
      def.parent.kind !== "const" ||
      def.node.id.type !== "Identifier" ||
      def.node.init?.type !== "Identifier"
    ) {
      return def;
    }
    const newDef = getIdentifierDefinition(def.node.init);
    tracked.set(node, newDef);
    return newDef;
  }
}

function parsePatternAssign(
  node: ESTree.Pattern,
  root: ESTree.Pattern,
): (
  | { type: "member"; name: string }
  | { type: "assignment"; node: ESTree.AssignmentPattern }
)[] {
  return parse(root) || [];

  function parse(
    target: ESTree.Pattern,
  ):
    | (
        | { type: "member"; name: string }
        | { type: "assignment"; node: ESTree.AssignmentPattern }
      )[]
    | null {
    if (node === target) {
      return [];
    }
    if (target.type === "Identifier") {
      return null;
    }
    if (target.type === "AssignmentPattern") {
      const left = parse(target.left);
      if (!left) return null;
      return [{ type: "assignment", node: target }, ...left];
    }
    if (target.type === "ObjectPattern") {
      for (const prop of target.properties) {
        if (prop.type === "Property") {
          const name =
            !prop.computed && prop.key.type === "Identifier"
              ? prop.key.name
              : prop.key.type === "Literal"
                ? String(prop.key.value)
                : null;
          if (!name) continue;
          const value = parse(prop.value);
          if (!value) return null;
          return [{ type: "member", name }, ...value];
        }
      }
      return null;
    }
    if (target.type === "ArrayPattern") {
      for (const [index, element] of target.elements.entries()) {
        if (!element) continue;
        const value = parse(element);
        if (!value) return null;
        return [{ type: "member", name: String(index) }, ...value];
      }
      return null;
    }
    return null;
  }
}
