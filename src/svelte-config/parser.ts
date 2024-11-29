import type { SvelteConfig } from "./index.js";
import type * as ESTree from "estree";
import type { Scope } from "eslint";
import type { ScopeManager } from "eslint-scope";
import { getFallbackKeys, traverseNodes } from "../traverse.js";
import { getEspree } from "../parser/espree.js";
import { analyze } from "eslint-scope";
import { findVariable } from "../scope/index.js";

export function parseConfig(code: string): SvelteConfig | null {
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

function parseAst(
  ast: ESTree.Program,
  scopeManager: ScopeManager,
): SvelteConfig {
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
): SvelteConfig {
  const evaluated = evaluateExpression(node, scopeManager);
  if (evaluated?.type !== EvaluatedType.object) return {};
  const result: SvelteConfig = {};
  // Returns only known properties.
  const compilerOptions = evaluated.getProperty("compilerOptions");
  if (compilerOptions?.type === EvaluatedType.object) {
    result.compilerOptions = {};
    const runes = compilerOptions.getProperty("runes")?.getStatic();
    if (runes?.value != null) {
      result.compilerOptions.runes = Boolean(runes.value);
    }
  }
  const kit = evaluated.getProperty("kit");
  if (kit?.type === EvaluatedType.object) {
    result.kit = {};
    const files = kit.getProperty("files")?.getStatic();
    if (files?.value != null) result.kit.files = files.value as never;
  }
  return result;
}

const enum EvaluatedType {
  literal,
  object,
}

type Evaluated = EvaluatedLiteral | EvaluatedObject;

class EvaluatedLiteral {
  public readonly type = EvaluatedType.literal;

  public value: unknown;

  public constructor(value: unknown) {
    this.value = value;
  }

  public getStatic() {
    return this;
  }
}

/** Evaluating an object expression. */
class EvaluatedObject {
  public readonly type = EvaluatedType.object;

  private readonly cached = new Map<string, Evaluated | null>();

  private readonly node: ESTree.ObjectExpression;

  private readonly parseExpression: (
    node: ESTree.Expression | ESTree.Pattern | ESTree.PrivateIdentifier,
  ) => Evaluated | null;

  public constructor(
    node: ESTree.ObjectExpression,
    parseExpression: (
      node: ESTree.Expression | ESTree.Pattern | ESTree.PrivateIdentifier,
    ) => Evaluated | null,
  ) {
    this.node = node;
    this.parseExpression = parseExpression;
  }

  /** Gets the evaluated value of the property with the given name. */
  public getProperty(key: string): Evaluated | null {
    return this.withCache(key, () => {
      let unknown = false;
      for (const prop of [...this.node.properties].reverse()) {
        if (prop.type === "Property") {
          const name = this.getKey(prop);
          if (name === key) return this.parseExpression(prop.value);
          if (name == null) unknown = true;
        } else if (prop.type === "SpreadElement") {
          const evaluated = this.parseExpression(prop.argument);
          if (evaluated?.type === EvaluatedType.object) {
            const value = evaluated.getProperty(key);
            if (value) return value;
          }
          unknown = true;
        }
      }
      return unknown ? null : new EvaluatedLiteral(undefined);
    });
  }

  public getStatic(): { value: Record<string, unknown> } | null {
    const object: Record<string, unknown> = {};
    for (const prop of this.node.properties) {
      if (prop.type === "Property") {
        const name = this.getKey(prop);
        if (name == null) return null;
        const evaluated = this.withCache(name, () =>
          this.parseExpression(prop.value),
        )?.getStatic();
        if (!evaluated) return null;
        object[name] = evaluated.value;
      } else if (prop.type === "SpreadElement") {
        const evaluated = this.parseExpression(prop.argument)?.getStatic();
        if (!evaluated) return null;
        Object.assign(object, evaluated.value);
      }
    }
    return { value: object };
  }

  private withCache(
    key: string,
    parse: () => Evaluated | null,
  ): Evaluated | null {
    if (this.cached.has(key)) return this.cached.get(key) || null;
    const evaluated = parse();
    this.cached.set(key, evaluated);
    return evaluated;
  }

  private getKey(node: ESTree.Property): string | null {
    if (!node.computed && node.key.type === "Identifier") return node.key.name;
    const evaluatedKey = this.parseExpression(node.key)?.getStatic();
    if (evaluatedKey) return String(evaluatedKey.value);
    return null;
  }
}

function evaluateExpression(
  node: ESTree.Expression,
  scopeManager: ScopeManager,
): Evaluated | null {
  const tracked = new Map<ESTree.Identifier, Scope.Definition[]>();
  return parseExpression(node);

  function parseExpression(
    node: ESTree.Expression | ESTree.Pattern | ESTree.PrivateIdentifier,
  ): Evaluated | null {
    if (node.type === "Literal") {
      return new EvaluatedLiteral(node.value);
    }
    if (node.type === "Identifier") {
      return parseIdentifier(node);
    }
    if (node.type === "ObjectExpression") {
      return new EvaluatedObject(node, parseExpression);
    }

    return null;
  }

  function parseIdentifier(node: ESTree.Identifier): Evaluated | null {
    const defs = getIdentifierDefinitions(node);
    if (defs.length !== 1) {
      if (defs.length === 0 && node.name === "undefined")
        return new EvaluatedLiteral(undefined);
      return null;
    }
    const def = defs[0];
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
        const next = result.getProperty(assign.name);
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

  function getIdentifierDefinitions(
    node: ESTree.Identifier,
  ): Scope.Definition[] {
    if (tracked.has(node)) return tracked.get(node)!;
    tracked.set(node, []);
    const defs = findVariable(scopeManager, node)?.defs;
    if (!defs) return [];
    tracked.set(node, defs);
    if (defs.length !== 1) {
      const def = defs[0];
      if (
        def.type === "Variable" &&
        def.parent.kind === "const" &&
        def.node.id.type === "Identifier" &&
        def.node.init?.type === "Identifier"
      ) {
        const newDef = getIdentifierDefinitions(def.node.init);
        tracked.set(node, newDef);
        return newDef;
      }
    }
    return defs;
  }
}

/**
 * Returns the assignment path.
 * For example,
 * `let {a: {target}} = {}`
 *   -> `[{type: "member", name: 'a'}, {type: "member", name: 'target'}]`.
 * `let {a: {target} = foo} = {}`
 *   -> `[{type: "member", name: 'a'}, {type: "assignment"}, {type: "member", name: 'target'}]`.
 */
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
