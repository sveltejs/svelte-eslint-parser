import type { SvelteConfig } from "./index.js";
import type * as ESTree from "estree";
import type { Scope } from "eslint";
import { getFallbackKeys, traverseNodes } from "../traverse.js";
import { getEspree } from "../parser/espree.js";
import { findVariable } from "../scope/index.js";
import { getESLintScope } from "../parser/eslint-scope.js";

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
  const { analyze } = getESLintScope();
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
  scopeManager: Scope.ScopeManager,
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
  scopeManager: Scope.ScopeManager,
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
    const experimental = compilerOptions.getProperty("experimental");
    if (experimental?.type === EvaluatedType.object) {
      const experimentalResult: Record<string, unknown> = {};
      const async = experimental.getProperty("async")?.getStatic();
      if (typeof async?.value === "boolean") {
        experimentalResult.async = async.value;
      }
      // Functions are not evaluated. Only `true` or a string is read.
      const customRenderer = experimental
        .getProperty("customRenderer")
        ?.getStatic();
      if (
        customRenderer?.value === true ||
        typeof customRenderer?.value === "string"
      ) {
        experimentalResult.customRenderer = customRenderer.value;
      }
      if (Object.keys(experimentalResult).length) {
        result.compilerOptions.experimental = experimentalResult as never;
      }
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

/** The object surely does not have the property. */
const ABSENT = Symbol("absent");
/** The object surely has the property, but its value is unknown. */
const UNKNOWN = Symbol("unknown");

type Found = Evaluated | null | typeof ABSENT | typeof UNKNOWN;

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

  private readonly cached = new Map<string, Found>();

  private staticCached: { value: Record<string, unknown> } | null | undefined;

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
    const value = this.findProperty(key);
    if (value === ABSENT) return new EvaluatedLiteral(undefined);
    if (value === UNKNOWN) return null;
    return value;
  }

  private findProperty(key: string): Found {
    const hit = this.cached.get(key);
    if (hit !== undefined) return hit;
    // A cyclic lookup gives unknown.
    this.cached.set(key, null);
    const value = this.scanProperty(key);
    this.cached.set(key, value);
    return value;
  }

  private scanProperty(key: string): Found {
    let unknown = false;
    for (const prop of [...this.node.properties].reverse()) {
      if (prop.type === "Property") {
        const name = this.getKey(prop);
        if (name === key) return this.parseExpression(prop.value) ?? UNKNOWN;
        if (name == null) unknown = true;
      } else if (prop.type === "SpreadElement") {
        const evaluated = this.parseExpression(prop.argument);
        if (evaluated?.type === EvaluatedType.object) {
          const value = evaluated.findProperty(key);
          if (value === ABSENT) continue;
          if (value) return value;
        } else if (
          evaluated?.type === EvaluatedType.literal &&
          evaluated.value == null
        ) {
          // Spreading `null` or `undefined` adds no properties.
          continue;
        }
        unknown = true;
      }
    }
    return unknown ? null : ABSENT;
  }

  public getStatic(): { value: Record<string, unknown> } | null {
    if (this.staticCached !== undefined) return this.staticCached;
    // A cyclic object gives unknown.
    this.staticCached = null;
    return (this.staticCached = this.evaluateStatic());
  }

  private evaluateStatic(): { value: Record<string, unknown> } | null {
    const object: Record<string, unknown> = {};
    for (const prop of this.node.properties) {
      if (prop.type === "Property") {
        const name = this.getKey(prop);
        if (name == null) return null;
        const evaluated = this.parseExpression(prop.value)?.getStatic();
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

  private getKey(node: ESTree.Property): string | null {
    if (!node.computed && node.key.type === "Identifier") return node.key.name;
    const evaluatedKey = this.parseExpression(node.key)?.getStatic();
    if (evaluatedKey) return String(evaluatedKey.value);
    return null;
  }
}

function evaluateExpression(
  node: ESTree.Expression,
  scopeManager: Scope.ScopeManager,
): Evaluated | null {
  const tracked = new Map<ESTree.Identifier, Scope.Definition[]>();
  // One object per node, so its cached values are shared.
  const objects = new Map<ESTree.ObjectExpression, EvaluatedObject>();
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
      let object = objects.get(node);
      if (!object) {
        object = new EvaluatedObject(node, parseExpression);
        objects.set(node, object);
      }
      return object;
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
