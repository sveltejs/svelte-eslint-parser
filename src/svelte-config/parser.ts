import type { SvelteConfig } from "./index.js";
import type * as ESTree from "estree";
import type { Scope } from "eslint";
import { getFallbackKeys, traverseNodes } from "../traverse.js";
import { getEspree } from "../parser/espree.js";
import { findVariable } from "../scope/index.js";
import { getESLintScope } from "../parser/eslint-scope.js";

export function parseConfig(code: string): SvelteConfig | null {
  const { ast, scopeManager } = parseCode(code);
  return parseAst(ast, scopeManager);
}

/**
 * Statically reads the Svelte config from the code of `vite.config.*`.
 * It looks for a `sveltekit(...)` call imported from `@sveltejs/kit/vite`,
 * or a `svelte(...)` call imported from `@sveltejs/vite-plugin-svelte`,
 * inside `plugins`, and reads its argument.
 * Returns `null` if the plugin is not found, it has no argument,
 * or the argument cannot be statically evaluated to an object.
 * It never throws.
 */
export function parseViteConfig(code: string): SvelteConfig | null {
  try {
    const { ast, scopeManager } = parseCode(code);
    return parseViteConfigAst(ast, scopeManager);
  } catch {
    return null;
  }
}

function parseCode(code: string): {
  ast: ESTree.Program;
  scopeManager: Scope.ScopeManager;
} {
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
  return { ast, scopeManager };
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
  const compilerOptions = readCompilerOptions(evaluated);
  if (compilerOptions) result.compilerOptions = compilerOptions;
  const kit = evaluated.getProperty("kit");
  if (kit?.type === EvaluatedType.object) {
    result.kit = {};
    const files = kit.getProperty("files")?.getStatic();
    if (files?.value != null) result.kit.files = files.value as never;
  }
  return result;
}

function readCompilerOptions(
  evaluated: EvaluatedObject,
): SvelteConfig["compilerOptions"] | null {
  const compilerOptions = evaluated.getProperty("compilerOptions");
  if (compilerOptions?.type !== EvaluatedType.object) return null;
  const result: NonNullable<SvelteConfig["compilerOptions"]> = {};
  const runes = compilerOptions.getProperty("runes")?.getStatic();
  if (runes?.value != null) {
    result.runes = Boolean(runes.value);
  }
  return result;
}

/** The Vite plugins that accept Svelte config as their argument. */
const SVELTE_VITE_PLUGINS: Record<string, string> = {
  "@sveltejs/kit/vite": "sveltekit",
  "@sveltejs/vite-plugin-svelte": "svelte",
};

function parseViteConfigAst(
  ast: ESTree.Program,
  scopeManager: Scope.ScopeManager,
): SvelteConfig | null {
  const edd = ast.body.find(
    (node): node is ESTree.ExportDefaultDeclaration =>
      node.type === "ExportDefaultDeclaration",
  );
  if (!edd) return null;
  const decl = edd.declaration;
  if (decl.type === "ClassDeclaration") return null;
  const config = resolveViteConfigObject(decl as ESTree.Node);
  if (!config) return null;
  const plugins = getStaticProperty(config, "plugins");
  if (!plugins) return null;
  for (const call of iteratePluginCalls(plugins, new Set())) {
    if (!isSveltePluginCallee(call.callee)) continue;
    const arg = call.arguments[0];
    if (!arg || arg.type === "SpreadElement") continue;
    const evaluated = evaluateExpression(arg, scopeManager);
    if (evaluated?.type !== EvaluatedType.object) continue;
    // Returns only known properties, in the SvelteKit 3 flat shape.
    const result: SvelteConfig = {};
    const runes = readCompilerOptions(evaluated)?.runes;
    if (runes != null) result.compilerOptions = { runes };
    const files = evaluated.getProperty("files")?.getStatic();
    if (files?.value != null) result.files = files.value as never;
    // Skip the call if it has no usable value, e.g. `svelte({ hot: false })`.
    if (result.compilerOptions || result.files) return result;
  }
  return null;

  /** Resolves the default export to the config object expression. */
  function resolveViteConfigObject(
    node: ESTree.Node,
  ): ESTree.ObjectExpression | null {
    const target = resolveConstNode(node);
    if (!target) return null;
    if (target.type === "ObjectExpression") return target;
    if (target.type === "CallExpression") {
      // defineConfig(...)
      if (
        target.callee.type !== "Identifier" ||
        target.callee.name !== "defineConfig"
      )
        return null;
      const arg = target.arguments[0];
      if (!arg || arg.type === "SpreadElement") return null;
      return resolveViteConfigObject(arg);
    }
    if (
      target.type === "ArrowFunctionExpression" ||
      target.type === "FunctionExpression" ||
      target.type === "FunctionDeclaration"
    ) {
      if (target.body.type !== "BlockStatement") {
        return resolveViteConfigObject(target.body);
      }
      const returns = target.body.body.filter(
        (n): n is ESTree.ReturnStatement => n.type === "ReturnStatement",
      );
      if (returns.length !== 1 || !returns[0].argument) return null;
      return resolveViteConfigObject(returns[0].argument);
    }
    return null;
  }

  /** Follows identifiers that are bound to a `const` with an initializer. */
  function resolveConstNode(
    node: ESTree.Node,
    seen = new Set<ESTree.Node>(),
  ): ESTree.Node | null {
    if (seen.has(node)) return null;
    seen.add(node);
    if (node.type !== "Identifier") return node;
    const defs = findVariable(scopeManager, node)?.defs;
    if (!defs || defs.length !== 1) return null;
    const def = defs[0];
    if (def.type === "FunctionName") return def.node;
    if (
      def.type !== "Variable" ||
      def.parent.kind !== "const" ||
      def.node.id.type !== "Identifier" ||
      !def.node.init
    )
      return null;
    return resolveConstNode(def.node.init, seen);
  }

  function getStaticProperty(
    object: ESTree.ObjectExpression,
    name: string,
  ): ESTree.Node | null {
    for (const prop of [...object.properties].reverse()) {
      if (prop.type !== "Property") continue;
      const key =
        !prop.computed && prop.key.type === "Identifier"
          ? prop.key.name
          : prop.key.type === "Literal"
            ? String(prop.key.value)
            : null;
      if (key === name) return prop.value;
    }
    return null;
  }

  /** Iterates the call expressions in `plugins`. Vite flattens nested arrays. */
  function* iteratePluginCalls(
    node: ESTree.Node,
    seen: Set<ESTree.Node>,
  ): Iterable<ESTree.CallExpression> {
    const target = resolveConstNode(node);
    if (!target || seen.has(target)) return;
    seen.add(target);
    if (target.type === "ArrayExpression") {
      for (const element of target.elements) {
        if (!element) continue;
        yield* iteratePluginCalls(
          element.type === "SpreadElement" ? element.argument : element,
          seen,
        );
      }
    } else if (target.type === "CallExpression") {
      yield target;
    } else if (target.type === "LogicalExpression") {
      // `cond && plugin()`: only the right side can be a plugin.
      // `a || b` and `a ?? b`: both sides can be.
      if (target.operator !== "&&") {
        yield* iteratePluginCalls(target.left, seen);
      }
      yield* iteratePluginCalls(target.right, seen);
    } else if (target.type === "ConditionalExpression") {
      yield* iteratePluginCalls(target.consequent, seen);
      yield* iteratePluginCalls(target.alternate, seen);
    }
  }

  /** Checks whether the callee is imported from one of the Svelte Vite plugin modules. */
  function isSveltePluginCallee(
    callee: ESTree.Expression | ESTree.Super,
  ): boolean {
    if (callee.type === "Identifier") {
      const def = getImportDefinition(callee);
      if (!def || def.node.type !== "ImportSpecifier") return false;
      const imported =
        def.node.imported.type === "Identifier"
          ? def.node.imported.name
          : String(def.node.imported.value);
      return SVELTE_VITE_PLUGINS[getImportSource(def)] === imported;
    }
    if (
      callee.type === "MemberExpression" &&
      callee.object.type === "Identifier"
    ) {
      // import * as kit from "@sveltejs/kit/vite"; kit.sveltekit()
      const def = getImportDefinition(callee.object);
      if (!def || def.node.type !== "ImportNamespaceSpecifier") return false;
      const name =
        !callee.computed && callee.property.type === "Identifier"
          ? callee.property.name
          : callee.property.type === "Literal"
            ? String(callee.property.value)
            : null;
      return name != null && SVELTE_VITE_PLUGINS[getImportSource(def)] === name;
    }
    return false;
  }

  function getImportDefinition(
    node: ESTree.Identifier,
  ): Scope.Definition | null {
    const defs = findVariable(scopeManager, node)?.defs;
    if (!defs || defs.length !== 1) return null;
    const def = defs[0];
    return def.type === "ImportBinding" ? def : null;
  }

  function getImportSource(def: Scope.Definition): string {
    const source = (def.parent as ESTree.ImportDeclaration | null)?.source
      ?.value;
    return String(source);
  }
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
  scopeManager: Scope.ScopeManager,
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
