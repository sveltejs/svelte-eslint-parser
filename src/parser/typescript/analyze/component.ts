import type { TSESTree } from "@typescript-eslint/types";
import type * as eslint from "eslint";
import { removeAllScopeAndVariableAndReference } from "../../../scope/index.js";
import type { VirtualTypeScriptContext } from "../context.js";
import type { TSESParseForESLintResult } from "../types.js";
import { setParent } from "../set-parent.js";
import type { SvelteParseContext } from "../../svelte-parse-context.js";
import { svelteVersion } from "../../svelte-version.js";

/**
 * Type-only method on a generic component's synthetic value. An importer calls
 * it with the attributes it passes so TypeScript infers the type arguments,
 * which a `Component<Props>` signature cannot express.
 */
export const GENERIC_PROPS_INFERENCE_KEY = "$$genericProps";

/** The instance script's `generics` attribute and its type parameter names. */
export type InstanceGenerics = { text: string; names: string[] };

/**
 * Append a synthetic component `export default` so importers can resolve the
 * component's prop, event, and slot types.
 *
 * The export must carry both a value and a type meaning: `ComponentProps<typeof
 * Foo>` uses the value, while `ComponentEvents<Foo>` and Svelte-4-style
 * `ComponentProps<Foo>` use `Foo` as a type. A bare `export default <expr>` only
 * provides the value, so emit a value/type pair re-exported as default.
 */
export function appendComponentDefaultExport(
  result: TSESParseForESLintResult,
  source: string,
  ctx: VirtualTypeScriptContext,
  svelteParseContext: SvelteParseContext,
  instanceScriptRange: [number, number] | null,
  generics: InstanceGenerics | null,
): void {
  if (hasDefaultExport(result.ast)) {
    return;
  }

  // Legacy recovery must only look at the instance script: a module-context
  // `export let` is not a prop, and `$$Props`/`$$Events`/`$$Slots` are only
  // meaningful in the instance script.
  const instanceStatements = getInstanceStatements(result, instanceScriptRange);

  const names: string[] = [];
  // Lead with a newline so a trailing line comment can't swallow the statement.
  let code = "\n";

  // Runes `$props()` takes precedence over legacy recovery; the last fallback
  // stays permissive so `typeof Foo` still resolves.
  let propsType: string;
  const runesProps = recoverRunesProps(
    result,
    source,
    svelteParseContext,
    instanceScriptRange,
  );
  if (runesProps?.kind === "explicit") {
    propsType = runesProps.type;
  } else if (runesProps != null) {
    const parts: string[] = [];
    if (runesProps.probe != null) {
      // Let TS infer the default value types via `typeof` of a probe object.
      const probeName = ctx.generateUniqueId("propsProbe");
      names.push(probeName);
      code += `const ${probeName} = ${runesProps.probe};`;
      parts.push(
        `{ [K in keyof typeof ${probeName}]?: (typeof ${probeName})[K] }`,
      );
    }
    if (runesProps.members != null) {
      parts.push(runesProps.members);
    }
    if (runesProps.open) {
      parts.push("{ [key: string]: any }");
    }
    // An empty destructuring declares no props at all, so nothing is accepted.
    propsType = parts.length ? parts.join(" & ") : "{ [key: string]: never }";
  } else {
    // A component reading `$$props`/`$$restProps` accepts arbitrary attributes,
    // so the synthesized (closed) type is opened with an index signature to
    // avoid spurious excess-property errors. `$$Props` is exempt: there the user
    // owns the open/closed decision.
    const dollarPropsType = getDollarDollarPropsType(
      instanceStatements,
      svelteParseContext,
    );
    if (dollarPropsType != null) {
      propsType = dollarPropsType;
    } else {
      const inferredBindings = new Set<string>();
      const probeName = ctx.generateUniqueId("legacyPropsProbe");
      const exportLetType = getLegacyExportLetPropsType(
        instanceStatements,
        source,
        svelteParseContext,
        (name) => {
          inferredBindings.add(name);
          return `(typeof ${probeName} extends () => infer P ? P : never)[${JSON.stringify(name)}]`;
        },
      );
      if (inferredBindings.size) {
        names.push(probeName);
        // A function avoids control-flow narrowing at the end of the script;
        // its object return also widens inferred boolean literal values.
        code += `const ${probeName} = () => ({ ${[...inferredBindings].join(", ")} });`;
      }
      if (exportLetType != null && referencesOpenProps(result)) {
        propsType = `${exportLetType} & { [key: string]: any }`;
      } else {
        propsType = exportLetType ?? "{ [key: string]: any }";
      }
    }
  }

  // Stay permissive without `$$Events`/`$$Slots` so `on:` and slots don't get
  // spurious errors.
  const eventsType = hasNamedTypeDeclaration(instanceStatements, "$$Events")
    ? "$$Events"
    : "{ [key: string]: any }";
  const slotsType = hasNamedTypeDeclaration(instanceStatements, "$$Slots")
    ? "$$Slots"
    : "{ [key: string]: any }";

  let genericPropsMethod: string | null = null;
  if (generics != null && svelteVersion.gte(5)) {
    // At the top level the generics are placeholder aliases, so local types
    // such as `interface Props { rows: T[] }` are copied into a generic
    // function where they see its type parameters instead.
    const scopeName = ctx.generateUniqueId("genericPropsScope");
    const declarations = instanceStatements
      .map((statement) =>
        statement.type === "ExportNamedDeclaration"
          ? statement.declaration
          : statement,
      )
      .filter(
        (node) =>
          node?.type === "TSInterfaceDeclaration" ||
          node?.type === "TSTypeAliasDeclaration",
      )
      // A declaration may omit its semicolon.
      .map((node) => `${source.slice(...node.range)};`);
    code += `function ${scopeName}<${generics.text}>() {${declarations.join("")}return null as any as ${propsType};}`;
    registerRemoval(
      ctx,
      (node) =>
        node.type === "FunctionDeclaration" && node.id?.name === scopeName,
    );
    const instantiated = `ReturnType<typeof ${scopeName}<${generics.names.join(", ")}>>`;
    genericPropsMethod = `{ ${GENERIC_PROPS_INFERENCE_KEY}<${generics.text}>(props: Partial<${instantiated}>): ${instantiated} }`;
  }

  const name = ctx.generateUniqueId("svelteComponent");
  names.push(name);
  const { valueType, typeType } = componentTypeText(
    propsType,
    eventsType,
    slotsType,
    getInstanceExportsType(instanceStatements, svelteParseContext),
    genericPropsMethod,
  );
  code += `declare const ${name}: ${valueType};type ${name} = ${typeType};export { ${name} as default };`;
  ctx.appendVirtualScript(code);

  // `export { <name> as default }`.
  registerRemoval(
    ctx,
    (node) =>
      node.type === "ExportNamedDeclaration" &&
      node.declaration == null &&
      node.specifiers.length === 1 &&
      node.specifiers[0].local.type === "Identifier" &&
      node.specifiers[0].local.name === name,
  );
  // `type <name> = ...`.
  registerRemoval(
    ctx,
    (node) => node.type === "TSTypeAliasDeclaration" && node.id.name === name,
  );
  // The `declare const <name>` and any props probe const.
  for (const nm of names) {
    registerRemoval(
      ctx,
      (node) =>
        node.type === "VariableDeclaration" &&
        node.declarations[0]?.id.type === "Identifier" &&
        node.declarations[0].id.name === nm,
    );
  }
}

/**
 * Value-side and type-side text of the synthetic default export, chosen by the
 * *installed* Svelte version rather than the component mode: Svelte 3/4 typings
 * have no `Component`, and Svelte 3's `SvelteComponent` is not generic.
 */
function componentTypeText(
  propsType: string,
  eventsType: string,
  slotsType: string,
  exportsType: string | null,
  genericPropsMethod: string | null,
): { valueType: string; typeType: string } {
  const typeArgs = `<${propsType}, ${eventsType}, ${slotsType}>`;

  // Instance exports are what `bind:this` hands back, so the instance type
  // carries them alongside the component class.
  function withExports(type: string) {
    return exportsType == null ? type : `${type} & ${exportsType}`;
  }

  if (svelteVersion.gte(5)) {
    // The value is Svelte 5's `Component` so `typeof Foo` matches modern usage;
    // the same-named legacy `SvelteComponent` type keeps `ComponentEvents<Foo>`
    // resolving.
    const componentType =
      exportsType == null
        ? `import('svelte').Component<${propsType}>`
        : `import('svelte').Component<${propsType}, ${exportsType}>`;
    return {
      valueType:
        genericPropsMethod == null
          ? componentType
          : `${componentType} & ${genericPropsMethod}`,
      typeType: withExports(`import('svelte').SvelteComponent${typeArgs}`),
    };
  }
  const className = svelteVersion.gte(4)
    ? "SvelteComponent"
    : "SvelteComponentTyped";
  const instanceType = withExports(`import('svelte').${className}${typeArgs}`);
  // A constructor value so `new Foo(...)` works and `typeof Foo` resolves; the
  // same-named type is the instance for `ComponentProps<Foo>` /
  // `ComponentEvents<Foo>`. `ComponentConstructorOptions` (present in Svelte 3
  // and 4) validates `new Foo({ props: … })` instead of accepting anything.
  return {
    valueType: `new (options: import('svelte').ComponentConstructorOptions<${propsType}>) => ${instanceType}`,
    typeType: instanceType,
  };
}

/** Register a restore process that splices a matching statement and cleans scope. */
function registerRemoval(
  ctx: VirtualTypeScriptContext,
  match: (node: TSESTree.Node) => boolean,
) {
  ctx.restoreContext.addRestoreStatementProcess((node, result) => {
    if (!match(node as TSESTree.Node)) {
      return false;
    }
    result.ast.body.splice(result.ast.body.indexOf(node as never), 1);
    removeAllScopeAndVariableAndReference(node as TSESTree.Node, {
      visitorKeys: result.visitorKeys,
      scopeManager: result.scopeManager as eslint.Scope.ScopeManager,
    });
    return true;
  });
}

function hasDefaultExport(ast: TSESParseForESLintResult["ast"]): boolean {
  return ast.body.some((node) => {
    if (node.type === "ExportDefaultDeclaration") {
      return true;
    }
    // `export { x as default }` counts as a user-authored default export too.
    if (node.type === "ExportNamedDeclaration") {
      return (
        node.exportKind !== "type" &&
        node.specifiers.some(
          (specifier) =>
            specifier.exportKind !== "type" &&
            exportName(specifier.exported) === "default",
        )
      );
    }
    return (
      node.type === "ExportAllDeclaration" &&
      node.exportKind !== "type" &&
      node.exported != null &&
      exportName(node.exported) === "default"
    );
  });
}

/** Get either spelling of an ES module export name. */
function exportName(
  node: TSESTree.Identifier | TSESTree.StringLiteral,
): string {
  return node.type === "Identifier" ? node.name : node.value;
}

/** Top-level statements of the instance `<script>`, filtered out of the concatenated body by source range. */
function getInstanceStatements(
  result: TSESParseForESLintResult,
  instanceScriptRange: [number, number] | null,
): TSESTree.ProgramStatement[] {
  if (!instanceScriptRange) {
    return [];
  }
  const [start, end] = instanceScriptRange;
  return result.ast.body.filter(
    (node) => start <= node.range[0] && node.range[1] <= end,
  );
}

function hasNamedTypeDeclaration(
  statements: TSESTree.ProgramStatement[],
  name: string,
): boolean {
  return statements.some((statement) => {
    const node =
      statement.type === "ExportNamedDeclaration"
        ? statement.declaration
        : statement;
    return (
      node != null &&
      (node.type === "TSInterfaceDeclaration" ||
        node.type === "TSTypeAliasDeclaration") &&
      node.id.name === name
    );
  });
}

/**
 * Svelte treats `$$Props` as the authoritative prop typing, so it takes priority
 * over `export let` inference. Referenced by name, since the declaration itself
 * stays in the virtual code.
 */
function getDollarDollarPropsType(
  instanceStatements: TSESTree.ProgramStatement[],
  svelteParseContext: SvelteParseContext,
): string | null {
  if (svelteParseContext.runes === true) {
    return null;
  }
  return hasNamedTypeDeclaration(instanceStatements, "$$Props")
    ? "$$Props"
    : null;
}

/**
 * Synthesize a props object type from legacy prop declarations, mirroring
 * svelte2tsx: a default value makes the prop optional, an explicit annotation is
 * used as-is, otherwise the type is inferred via `typeof`. Renamed exports whose
 * local is a top-level `let` (`export { className as class }`) are props too.
 */
function getLegacyExportLetPropsType(
  instanceStatements: TSESTree.ProgramStatement[],
  source: string,
  svelteParseContext: SvelteParseContext,
  inferBinding: (name: string) => string,
): string | null {
  // `export let` is only a prop declaration in legacy (non-runes) mode.
  if (svelteParseContext.runes === true) {
    return null;
  }
  const members: string[] = [];

  function pushMember(
    exportedName: string,
    declarator: TSESTree.LetOrConstOrVarDeclarator,
  ): void {
    const optional = declarator.init != null;
    const typeAnnotation =
      declarator.id.type === "Identifier"
        ? declarator.id.typeAnnotation
        : undefined;
    const localName =
      declarator.id.type === "Identifier" ? declarator.id.name : null;
    const typeText = typeAnnotation
      ? source.slice(
          typeAnnotation.typeAnnotation.range[0],
          typeAnnotation.typeAnnotation.range[1],
        )
      : localName != null
        ? (declarator.init &&
            degenerateDefaultType(stripAsConst(declarator.init))) ||
          inferBinding(localName)
        : "any";
    members.push(`${propKey(exportedName)}${optional ? "?" : ""}: ${typeText}`);
  }

  // Indexed by binding name so a renamed export can resolve its local `let`.
  const letDeclarators = new Map<string, TSESTree.LetOrConstOrVarDeclarator>();
  for (const node of instanceStatements) {
    const decl =
      node.type === "ExportNamedDeclaration" ? node.declaration : node;
    if (decl?.type !== "VariableDeclaration" || decl.kind !== "let") {
      continue;
    }
    for (const declarator of decl.declarations) {
      if (declarator.id.type === "Identifier") {
        letDeclarators.set(declarator.id.name, declarator);
      }
    }
  }

  for (const node of instanceStatements) {
    if (node.type !== "ExportNamedDeclaration" || node.exportKind === "type") {
      continue;
    }
    if (
      node.declaration?.type === "VariableDeclaration" &&
      node.declaration.kind === "let"
    ) {
      for (const declarator of node.declaration.declarations) {
        if (declarator.id.type !== "Identifier") {
          continue;
        }
        pushMember(declarator.id.name, declarator);
      }
      continue;
    }
    // A renamed (or same-name) export of a top-level `let` binding is a prop.
    // Skip re-exports (`export … from '…'`) and `default` (handled elsewhere).
    if (node.declaration == null && node.source == null) {
      for (const specifier of node.specifiers) {
        if (
          specifier.local.type !== "Identifier" ||
          specifier.exportKind === "type" ||
          exportName(specifier.exported) === "default"
        ) {
          continue;
        }
        const declarator = letDeclarators.get(specifier.local.name);
        if (!declarator) {
          continue;
        }
        pushMember(exportName(specifier.exported), declarator);
      }
    }
  }
  if (!members.length) {
    return null;
  }
  return `{ ${members.join("; ")} }`;
}

/**
 * Collect the instance script's component exports (`export const`, `export
 * function`, `export class`, and `export { x }`) as a type literal, mirroring
 * svelte2tsx. In legacy mode an exported `let` is a prop rather than an export.
 */
function getInstanceExportsType(
  instanceStatements: TSESTree.ProgramStatement[],
  svelteParseContext: SvelteParseContext,
): string | null {
  const legacy = svelteParseContext.runes !== true;
  const letBindings = new Set<string>();
  for (const node of instanceStatements) {
    const decl =
      node.type === "ExportNamedDeclaration" ? node.declaration : node;
    if (decl?.type !== "VariableDeclaration" || decl.kind !== "let") {
      continue;
    }
    for (const declarator of decl.declarations) {
      if (declarator.id.type === "Identifier") {
        letBindings.add(declarator.id.name);
      }
    }
  }

  const members = new Map<string, string>();
  for (const node of instanceStatements) {
    if (node.type !== "ExportNamedDeclaration" || node.exportKind === "type") {
      continue;
    }
    const decl = node.declaration;
    if (decl?.type === "VariableDeclaration") {
      if (legacy && decl.kind === "let") {
        continue;
      }
      for (const declarator of decl.declarations) {
        if (declarator.id.type === "Identifier") {
          members.set(declarator.id.name, declarator.id.name);
        }
      }
    } else if (
      (decl?.type === "FunctionDeclaration" ||
        decl?.type === "ClassDeclaration") &&
      decl.id != null
    ) {
      members.set(decl.id.name, decl.id.name);
    } else if (decl == null && node.source == null) {
      for (const specifier of node.specifiers) {
        if (
          specifier.local.type !== "Identifier" ||
          specifier.exportKind === "type"
        ) {
          continue;
        }
        const exported = exportName(specifier.exported);
        if (
          exported === "default" ||
          (legacy && letBindings.has(specifier.local.name))
        ) {
          continue;
        }
        members.set(exported, specifier.local.name);
      }
    }
  }
  if (!members.size) {
    return null;
  }
  return `{ ${[...members]
    .map(([exported, local]) => `${propKey(exported)}: typeof ${local}`)
    .join("; ")} }`;
}

/** Quote non-identifier keys so reserved-word prop names like `class` are emitted safely. */
function propKey(name: string): string {
  return /^[$A-Z_a-z][\w$]*$/u.test(name) ? name : JSON.stringify(name);
}

/** Unresolved prop globals in either the instance script or template open the props. */
function referencesOpenProps(result: TSESParseForESLintResult): boolean {
  return result.scopeManager.globalScope!.through.some(
    ({ identifier }) =>
      identifier.name === "$$props" || identifier.name === "$$restProps",
  );
}

/**
 * The two paths are kept apart because `explicit` carries a whole user-written
 * type, which may be a union: intersecting it with anything else would mis-bind,
 * since `&` binds tighter than `|`.
 */
type RecoveredProps =
  | { kind: "explicit"; type: string }
  | {
      kind: "inferred";
      /** Members recovered from the destructuring pattern, or `null`. */
      members: string | null;
      /** Probe object literal of defaulted props (`{ count: 0 }`), or `null`. */
      probe: string | null;
      /** The props could not be fully enumerated, so the type must stay open. */
      open: boolean;
    };

/**
 * Recover props from a runes `$props()` declaration. An explicit annotation,
 * `as`, or `satisfies` type is used as-is; otherwise the type is inferred from
 * the destructuring.
 *
 * Only a top-level instance-script declaration counts, since that is the only
 * place Svelte accepts `$props()`; a `<script module>` call must not hijack the
 * real declaration.
 */
function recoverRunesProps(
  result: TSESParseForESLintResult,
  source: string,
  svelteParseContext: SvelteParseContext,
  instanceScriptRange: [number, number] | null,
): RecoveredProps | null {
  if (svelteParseContext.runes === false || !instanceScriptRange) {
    return null;
  }
  const [instanceStart, instanceEnd] = instanceScriptRange;
  const propsReferences = result.scopeManager.globalScope!.through.filter(
    (reference) => {
      const { name, range } = reference.identifier;
      return (
        name === "$props" &&
        range != null &&
        instanceStart <= range[0] &&
        range[1] <= instanceEnd
      );
    },
  );
  if (!propsReferences.length) {
    return null;
  }
  setParent(result);
  for (const reference of propsReferences) {
    const id = reference.identifier as TSESTree.Identifier;
    const call = id.parent;
    if (call?.type !== "CallExpression" || call.callee !== id) {
      continue;
    }
    // Trailing `as`/`satisfies`/`!` operators sit between the call and the
    // declarator and can be stacked. The outermost annotation is the effective
    // type, so keep overwriting; `!` only unwraps.
    let valueNode: TSESTree.Expression = call;
    let castType: TSESTree.TypeNode | null = null;
    for (;;) {
      const parent: TSESTree.Node | undefined = valueNode.parent;
      if (
        parent?.type === "TSAsExpression" ||
        parent?.type === "TSSatisfiesExpression"
      ) {
        castType = parent.typeAnnotation;
        valueNode = parent;
      } else if (parent?.type === "TSNonNullExpression") {
        valueNode = parent;
      } else {
        break;
      }
    }
    if (
      valueNode.parent?.type !== "VariableDeclarator" ||
      valueNode.parent.init !== valueNode ||
      !isTopLevelDeclarator(valueNode.parent)
    ) {
      continue;
    }
    const declId = valueNode.parent.id;
    // The binding annotation is the public contract, even when the initializer
    // is asserted to a narrower type.
    const type = declId.typeAnnotation?.typeAnnotation ?? castType;
    if (type) {
      return {
        kind: "explicit",
        type: source.slice(type.range[0], type.range[1]),
      };
    }
    if (declId.type === "ObjectPattern") {
      return inferPropsFromObjectPattern(declId, source);
    }
  }
  return null;
}

function isTopLevelDeclarator(
  declarator: TSESTree.VariableDeclarator,
): boolean {
  const declaration = declarator.parent;
  const statement =
    declaration.parent?.type === "ExportNamedDeclaration"
      ? declaration.parent
      : declaration;
  return statement.parent?.type === "Program";
}

/**
 * Defaults go through a probe object because only TS can type the default
 * expression; a prop with no default has no type source at all, so it stays a
 * required `any`, as in svelte2tsx.
 */
function inferPropsFromObjectPattern(
  pattern: TSESTree.ObjectPattern,
  source: string,
): RecoveredProps {
  const members: string[] = [];
  const defaulted: string[] = [];
  // A prop can be destructured twice (`{ a, a: b }`, `{ 1e3: p, 1_000: q }`);
  // emitting the key twice would be a TS2300 duplicate identifier.
  const seen = new Set<string>();
  let open = false;
  for (const prop of pattern.properties) {
    if (prop.type !== "Property") {
      open = true;
      continue;
    }
    // Keys are taken raw so a string key keeps its quotes. A literal key is
    // resolvable even when computed (`["a"]`), unlike an identifier one (`[k]`).
    // Bigint keys are excluded: `0n` is not a valid type-literal key.
    let key: string, normalized: string;
    if (!prop.computed && prop.key.type === "Identifier") {
      key = prop.key.name;
      normalized = prop.key.name;
    } else if (
      prop.key.type === "Literal" &&
      (typeof prop.key.value === "string" || typeof prop.key.value === "number")
    ) {
      key = prop.key.raw;
      // `String` matches `ToPropertyKey`, so `1e3`, `1_000` and `"1000"` agree.
      normalized = String(prop.key.value);
    } else {
      open = true;
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    if (prop.value.type === "AssignmentPattern") {
      let def = stripAsConst(prop.value.right);
      // $bindable is a marker, not the default's type. Unwrap its fallback so
      // null/undefined/empty arrays receive the same widening as plain defaults.
      if (
        def.type === "CallExpression" &&
        def.callee.type === "Identifier" &&
        def.callee.name === "$bindable" &&
        !def.typeArguments
      ) {
        const fallback = def.arguments[0];
        if (!fallback) {
          members.push(`${key}?: any`);
          continue;
        }
        if (fallback.type !== "SpreadElement") def = stripAsConst(fallback);
      }
      const degraded = degenerateDefaultType(def);
      if (degraded != null) {
        members.push(`${key}?: ${degraded}`);
        continue;
      }
      // ESTree ranges exclude wrapping parens, so a sequence expression default
      // would slice to `1, 2` and make the probe object literal invalid.
      defaulted.push(`${key}: (${source.slice(def.range[0], def.range[1])})`);
    } else {
      members.push(`${key}: any`);
    }
  }
  return {
    kind: "inferred",
    members: members.length ? `{ ${members.join("; ")} }` : null,
    probe: defaulted.length ? `{ ${defaulted.join(", ")} }` : null,
    open,
  };
}

/**
 * Unwrap `X as const`, whose `const` parses as a type reference rather than a
 * keyword. The frozen literal type it produces would reject every other value an
 * importer passes; an author who wants that narrowing writes an explicit
 * annotation, which takes precedence anyway.
 */
function stripAsConst(node: TSESTree.Expression): TSESTree.Expression {
  if (
    node.type === "TSAsExpression" &&
    node.typeAnnotation.type === "TSTypeReference" &&
    node.typeAnnotation.typeName.type === "Identifier" &&
    node.typeAnnotation.typeName.name === "const"
  ) {
    return node.expression;
  }
  return node;
}

/**
 * Defaults that TS can only infer as an uninhabitable type (`never[]`, `null`,
 * `undefined`), which would reject every value an importer can pass. svelte2tsx
 * degrades them to `any` for the same reason.
 */
function degenerateDefaultType(node: TSESTree.Expression): string | null {
  if (node.type === "ArrayExpression" && node.elements.length === 0) {
    return "any[]";
  }
  // `raw` distinguishes the null literal from a regex literal, whose `value` is
  // also null when the environment cannot build the `RegExp`.
  if (node.type === "Literal" && node.raw === "null") {
    return "any";
  }
  if (node.type === "Identifier" && node.name === "undefined") {
    return "any";
  }
  if (node.type === "UnaryExpression" && node.operator === "void") {
    return "any";
  }
  return null;
}
