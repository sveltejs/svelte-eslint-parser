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

  // Set when this object is the rest of a pattern, such as `rest` in
  // `const {a, ...rest} = obj`: `base` is `obj`, and `omitted` has `a`.
  private base: EvaluatedObject | null = null;

  private omitted: ReadonlySet<string> = new Set();

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

  /** Returns this object without the given properties. */
  public omit(keys: string[]): EvaluatedObject {
    const object = new EvaluatedObject(this.node, this.parseExpression);
    object.base = this.base ?? this;
    object.omitted = new Set([...this.omitted, ...keys]);
    return object;
  }

  /** Gets the evaluated value of the property with the given name. */
  public getProperty(key: string): Evaluated | null {
    const value = this.findProperty(key);
    if (value === ABSENT) return new EvaluatedLiteral(undefined);
    if (value === UNKNOWN) return null;
    return value;
  }

  private findProperty(key: string): Found {
    if (this.base) {
      return this.omitted.has(key) ? ABSENT : this.base.findProperty(key);
    }
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
        const name = getPropertyKey(prop, this.parseExpression);
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
    if (this.base) {
      const evaluated = this.base.getStatic();
      if (!evaluated) return null;
      const object = { ...evaluated.value };
      for (const key of this.omitted) delete object[key];
      return { value: object };
    }
    if (this.staticCached !== undefined) return this.staticCached;
    // A cyclic object gives unknown.
    this.staticCached = null;
    return (this.staticCached = this.evaluateStatic());
  }

  private evaluateStatic(): { value: Record<string, unknown> } | null {
    const object: Record<string, unknown> = {};
    for (const prop of this.node.properties) {
      if (prop.type === "Property") {
        const name = getPropertyKey(prop, this.parseExpression);
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
}

function getPropertyKey(
  node: ESTree.Property,
  parseExpression: (
    node: ESTree.Expression | ESTree.Pattern | ESTree.PrivateIdentifier,
  ) => Evaluated | null,
): string | null {
  if (!node.computed && node.key.type === "Identifier") return node.key.name;
  const evaluatedKey = parseExpression(node.key)?.getStatic();
  if (!evaluatedKey) return null;
  try {
    return String(evaluatedKey.value);
  } catch {
    // For example, an object without a prototype.
    return null;
  }
}

function evaluateExpression(
  node: ESTree.Expression,
  scopeManager: Scope.ScopeManager,
): Evaluated | null {
  const tracked = new Map<ESTree.Identifier, Scope.Definition[]>();
  const resolving = new Set<ESTree.Identifier>();
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
    // A variable that refers to itself gives unknown.
    if (resolving.has(def.name)) return null;
    resolving.add(def.name);
    try {
      return resolveVariable(def.name, def.node.id, def.node.init);
    } finally {
      resolving.delete(def.name);
    }
  }

  function resolveVariable(
    name: ESTree.Identifier,
    id: ESTree.Pattern,
    init: ESTree.Expression,
  ): Evaluated | null {
    const evaluated = parseExpression(init);
    if (!evaluated) return null;
    const assigns = parsePatternAssign(name, id, (prop) =>
      getPropertyKey(prop, parseExpression),
    );
    if (!assigns) return null;
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
      } else if (assign.type === "rest") {
        if (result.type !== EvaluatedType.object) return null;
        result = result.omit(assign.omitted);
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

type PatternAssign =
  | { type: "member"; name: string }
  | { type: "assignment"; node: ESTree.AssignmentPattern }
  | { type: "rest"; omitted: string[] };

/**
 * Returns the assignment path, or `null` if it is unknown.
 * For example,
 * `let {a: {target}} = {}`
 *   -> `[{type: "member", name: 'a'}, {type: "member", name: 'target'}]`.
 * `let {a: {target} = foo} = {}`
 *   -> `[{type: "member", name: 'a'}, {type: "assignment"}, {type: "member", name: 'target'}]`.
 * `let {a, ...target} = {}`
 *   -> `[{type: "rest", omitted: ['a']}]`.
 */
function parsePatternAssign(
  node: ESTree.Pattern,
  root: ESTree.Pattern,
  getKey: (node: ESTree.Property) => string | null,
): PatternAssign[] | null {
  return parse(root) ?? null;

  /** Returns `undefined` if `target` does not contain `node`. */
  function parse(target: ESTree.Pattern): PatternAssign[] | null | undefined {
    if (node === target) {
      return [];
    }
    if (target.type === "Identifier") {
      return undefined;
    }
    if (target.type === "AssignmentPattern") {
      const left = parse(target.left);
      if (left == null) return left;
      return [{ type: "assignment", node: target }, ...left];
    }
    if (target.type === "ObjectPattern") {
      const omitted: string[] = [];
      let unknownKey = false;
      for (const prop of target.properties) {
        if (prop.type === "Property") {
          const name = getKey(prop);
          if (name == null) unknownKey = true;
          else omitted.push(name);
          const value = parse(prop.value);
          if (value === undefined) continue;
          if (!value || name == null) return null;
          return [{ type: "member", name }, ...value];
        }
        const value = parse(prop.argument);
        if (value === undefined) continue;
        if (!value || unknownKey) return null;
        return [{ type: "rest", omitted }, ...value];
      }
      return undefined;
    }
    if (target.type === "ArrayPattern") {
      for (const [index, element] of target.elements.entries()) {
        if (!element) continue;
        const value = parse(element);
        if (value === undefined) continue;
        // An array rest gives an array, which is not evaluated.
        if (!value || element.type === "RestElement") return null;
        return [{ type: "member", name: String(index) }, ...value];
      }
      return undefined;
    }
    if (target.type === "RestElement") {
      return parse(target.argument);
    }
    return null;
  }
}
