import type { TSESTree } from "@typescript-eslint/types";
import type * as eslint from "eslint";
import {
  addAllReferences,
  addVariable,
  getAllReferences,
  getProgramScope,
  removeAllScopeAndVariableAndReference,
  removeIdentifierReference,
  removeIdentifierVariable,
  replaceScope,
} from "../../../scope/index.js";
import {
  addElementsToSortedArray,
  sortedLastIndex,
} from "../../../utils/index.js";
import { parseScriptWithoutAnalyzeScope } from "../../script.js";
import { VirtualTypeScriptContext } from "../context.js";
import type { TSESParseForESLintResult } from "../types.js";
import type ESTree from "estree";
import type { SvelteAttribute, SvelteHTMLElement } from "../../../ast/index.js";
import type { NormalizedParserOptions } from "../../parser-options.js";
import { setParent } from "../set-parent.js";
import { getGlobalsForSvelte, globalsForRunes } from "../../globals.js";
import type { SvelteParseContext } from "../../svelte-parse-context.js";
import { withoutProjectParserOptions } from "../../parser-options.js";
import { svelteVersion } from "../../svelte-version.js";

export type AnalyzeTypeScriptContext = {
  slots: Set<SvelteHTMLElement>;
  svelteParseContext: SvelteParseContext;
  /** Source range of the instance `<script>` content; the virtual code concatenates both scripts. */
  instanceScriptRange?: [number, number] | null;
};

type TransformInfo = {
  node: TSESTree.Node;
  transform: (ctx: VirtualTypeScriptContext) => void;
};

type SvelteTypeScriptCode = {
  /**
   * User-authored <script> content.
   *
   * Example:
   *   <script lang="ts">
   *     const x = $derived(0);
   *   </script>
   */
  script: string;

  /**
   * Template code that is wrapped in the synthetic render function, where
   * template scopes are modeled.
   *
   * Example:
   *   {#if ok}
   *     {const x = $derived(0)}
   *   {/if}
   */
  render: string;

  /**
   * Template-generated code that must stay outside the render wrapper, such as
   * top-level snippets.
   *
   * Example:
   *   {#snippet s()}
   *     {const x = $derived(0)}
   *   {/snippet}
   */
  rootScope: string;
};

/**
 * Analyze TypeScript source code in Svelte.
 * Generate virtual code to provide correct type information for Svelte store reference names, scopes, and runes.
 * See https://github.com/sveltejs/svelte-eslint-parser/blob/main/docs/internal-mechanism.md#scope-types
 */
export function analyzeTypeScriptInSvelte(
  /** Split virtual code generated from the Svelte component. */
  code: SvelteTypeScriptCode,
  attrs: Record<string, string | undefined>,
  parserOptions: NormalizedParserOptions,
  context: AnalyzeTypeScriptContext,
): VirtualTypeScriptContext {
  const ctx = new VirtualTypeScriptContext(
    code.script + code.render + code.rootScope,
  );
  ctx.appendOriginal(/^\s*/u.exec(code.script)![0].length);

  const result = parseScriptWithoutAnalyzeScope(
    code.script + code.render + code.rootScope,
    attrs,
    withoutProjectParserOptions(parserOptions),
  ) as unknown as TSESParseForESLintResult;

  ctx._beforeResult = result;

  analyzeStoreReferenceNames(result, context.svelteParseContext, ctx);

  analyzeDollarDollarVariables(
    result,
    ctx,
    context.svelteParseContext,
    context.slots,
  );

  analyzeRuneVariables(result, ctx, context.svelteParseContext);

  const scriptTransformers: TransformInfo[] = [
    ...analyzeReactiveScopes(result),
  ];
  const renderTransformers: TransformInfo[] = [];
  const rootScopeTransformers: TransformInfo[] = [];
  const renderStart = code.script.length;
  const rootScopeStart = code.script.length + code.render.length;
  for (const transform of analyzeDollarDerivedScopes(
    result,
    context.svelteParseContext,
  )) {
    if (transform.node.range[0] < renderStart) {
      scriptTransformers.push(transform);
    } else if (transform.node.range[0] < rootScopeStart) {
      renderTransformers.push(transform);
    } else {
      rootScopeTransformers.push(transform);
    }
  }

  applyTransforms(scriptTransformers, ctx);

  analyzeRenderScopes(code, ctx, () =>
    applyTransforms(renderTransformers, ctx),
  );

  // Type checking non-module TypeScript code can report
  // `Cannot redeclare block-scoped variable 'xxx'`, so add a dummy export.
  // Keep it before consuming `rootScope` so it remains a standalone statement
  // at the render/rootScope boundary instead of splitting transformed rootScope
  // expressions such as `{#snippet s()}{const x = $derived(0)}{/snippet}`.
  // See https://github.com/sveltejs/svelte-eslint-parser/issues/557
  if (!hasExportDeclaration(result.ast)) {
    appendDummyExport(ctx);
  }

  // This starts consuming `rootScope`. Keep it after `analyzeRenderScopes()` so
  // top-level snippet code is emitted outside the synthetic render function:
  //   {#snippet s()}
  //     {const x = $derived(0)}
  //   {/snippet}
  // Keep it after the dummy export above so the export can stay at the
  // render/rootScope boundary.
  applyTransforms(rootScopeTransformers, ctx);

  ctx.appendOriginalToEnd();

  // Emitted last so it lands as a standalone top-level statement.
  appendComponentDefaultExport(
    result,
    code.script + code.render + code.rootScope,
    ctx,
    context.svelteParseContext,
    context.instanceScriptRange ?? null,
  );

  return ctx;
}
/**
 * Analyze TypeScript source code.
 * Generate virtual code to provide correct type information for Svelte runes.
 * See https://github.com/sveltejs/svelte-eslint-parser/blob/main/docs/internal-mechanism.md#scope-types
 */
export function analyzeTypeScript(
  code: string,
  attrs: Record<string, string | undefined>,
  parserOptions: NormalizedParserOptions,
  svelteParseContext: SvelteParseContext,
): VirtualTypeScriptContext {
  const ctx = new VirtualTypeScriptContext(code);
  ctx.appendOriginal(/^\s*/u.exec(code)![0].length);

  const result = parseScriptWithoutAnalyzeScope(
    code,
    attrs,
    withoutProjectParserOptions(parserOptions),
  ) as unknown as TSESParseForESLintResult;

  ctx._beforeResult = result;

  analyzeRuneVariables(result, ctx, svelteParseContext);

  applyTransforms(
    [...analyzeDollarDerivedScopes(result, svelteParseContext)],
    ctx,
  );

  ctx.appendOriginalToEnd();

  return ctx;
}

function hasExportDeclaration(ast: TSESParseForESLintResult["ast"]): boolean {
  for (const node of ast.body) {
    if (
      node.type === "ExportNamedDeclaration" ||
      node.type === "ExportDefaultDeclaration"
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Append a synthetic component `export default` so importers can resolve the
 * component's prop, event, and slot types.
 *
 * The export must carry both a value and a type meaning: `ComponentProps<typeof
 * Foo>` uses the value, while `ComponentEvents<Foo>` and Svelte-4-style
 * `ComponentProps<Foo>` use `Foo` as a type. A bare `export default <expr>` only
 * provides the value, so emit a value/type pair re-exported as default.
 */
function appendComponentDefaultExport(
  result: TSESParseForESLintResult,
  source: string,
  ctx: VirtualTypeScriptContext,
  svelteParseContext: SvelteParseContext,
  instanceScriptRange: [number, number] | null,
) {
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
  if (runesProps != null) {
    const parts: string[] = [];
    if (runesProps.probe != null) {
      // Let TS infer the default value types via `typeof` of a probe object.
      const probeName = ctx.generateUniqueId("propsProbe");
      names.push(probeName);
      code += `const ${probeName} = ${runesProps.probe};`;
      parts.push(`Partial<typeof ${probeName}>`);
    }
    if (runesProps.type != null) {
      parts.push(runesProps.type);
    }
    if (runesProps.open) {
      parts.push("Record<string, any>");
    }
    // An empty destructuring declares no props at all, so nothing is accepted.
    propsType = parts.length ? parts.join(" & ") : "Record<string, never>";
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
      const exportLetType = getLegacyExportLetPropsType(
        instanceStatements,
        source,
        svelteParseContext,
      );
      if (
        exportLetType != null &&
        referencesOpenProps(result, instanceScriptRange)
      ) {
        propsType = `${exportLetType} & { [key: string]: any }`;
      } else {
        propsType = exportLetType ?? "Record<string, any>";
      }
    }
  }

  // Stay permissive without `$$Events`/`$$Slots` so `on:` and slots don't get
  // spurious errors.
  const eventsType = hasNamedTypeDeclaration(instanceStatements, "$$Events")
    ? "$$Events"
    : "Record<string, any>";
  const slotsType = hasNamedTypeDeclaration(instanceStatements, "$$Slots")
    ? "$$Slots"
    : "Record<string, any>";

  const name = ctx.generateUniqueId("svelteComponent");
  names.push(name);
  const { valueType, typeType } = componentTypeText(
    propsType,
    eventsType,
    slotsType,
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
): { valueType: string; typeType: string } {
  const typeArgs = `<${propsType}, ${eventsType}, ${slotsType}>`;
  if (svelteVersion.gte(5)) {
    // The value is Svelte 5's `Component` so `typeof Foo` matches modern usage;
    // the same-named legacy `SvelteComponent` type keeps `ComponentEvents<Foo>`
    // resolving.
    return {
      valueType: `import('svelte').Component<${propsType}>`,
      typeType: `import('svelte').SvelteComponent${typeArgs}`,
    };
  }
  const className = svelteVersion.gte(4)
    ? "SvelteComponent"
    : "SvelteComponentTyped";
  const instanceType = `import('svelte').${className}${typeArgs}`;
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
      return node.specifiers.some(
        (specifier) =>
          specifier.exported.type === "Identifier" &&
          specifier.exported.name === "default",
      );
    }
    return false;
  });
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
  return statements.some(
    (node) =>
      (node.type === "TSInterfaceDeclaration" ||
        node.type === "TSTypeAliasDeclaration") &&
      node.id.name === name,
  );
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
        ? `typeof ${localName}`
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
    if (node.type !== "ExportNamedDeclaration") {
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
          specifier.exported.type !== "Identifier" ||
          specifier.exported.name === "default"
        ) {
          continue;
        }
        const declarator = letDeclarators.get(specifier.local.name);
        if (!declarator) {
          continue;
        }
        pushMember(specifier.exported.name, declarator);
      }
    }
  }
  if (!members.length) {
    return null;
  }
  return `{ ${members.join("; ")} }`;
}

/** Quote non-identifier keys so reserved-word prop names like `class` are emitted safely. */
function propKey(name: string): string {
  return /^[$A-Z_a-z][\w$]*$/u.test(name) ? name : JSON.stringify(name);
}

/** Whether the instance script references `$$props` or `$$restProps`. */
function referencesOpenProps(
  result: TSESParseForESLintResult,
  instanceScriptRange: [number, number] | null,
): boolean {
  if (!instanceScriptRange) {
    return false;
  }
  const [start, end] = instanceScriptRange;
  return result.scopeManager.globalScope!.through.some((reference) => {
    const { name, range } = reference.identifier;
    return (
      (name === "$$props" || name === "$$restProps") &&
      range != null &&
      start <= range[0] &&
      range[1] <= end
    );
  });
}

type RecoveredProps = {
  /** The whole props type when annotated, else the members recovered from the pattern. */
  type: string | null;
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
    // A trailing `as`/`satisfies` cast carries the type, between call and declarator.
    let valueNode: TSESTree.Expression = call;
    let castType: TSESTree.TypeNode | null = null;
    if (
      call.parent?.type === "TSAsExpression" ||
      call.parent?.type === "TSSatisfiesExpression"
    ) {
      castType = call.parent.typeAnnotation;
      valueNode = call.parent;
    }
    if (
      valueNode.parent?.type !== "VariableDeclarator" ||
      valueNode.parent.init !== valueNode ||
      !isTopLevelDeclarator(valueNode.parent)
    ) {
      continue;
    }
    if (castType) {
      return {
        type: source.slice(castType.range[0], castType.range[1]),
        probe: null,
        open: false,
      };
    }
    const declId = valueNode.parent.id;
    const annotation = declId.typeAnnotation;
    if (annotation) {
      const node = annotation.typeAnnotation;
      return {
        type: source.slice(node.range[0], node.range[1]),
        probe: null,
        open: false,
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
  let open = false;
  for (const prop of pattern.properties) {
    if (prop.type !== "Property" || prop.computed) {
      open = true;
      continue;
    }
    // String-literal keys are taken raw, so their quotes are preserved.
    let key: string;
    if (prop.key.type === "Identifier") {
      key = prop.key.name;
    } else if (
      prop.key.type === "Literal" &&
      typeof prop.key.value === "string"
    ) {
      key = prop.key.raw;
    } else {
      open = true;
      continue;
    }
    if (prop.value.type === "AssignmentPattern") {
      const def = prop.value.right;
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
    type: members.length ? `{ ${members.join("; ")} }` : null,
    probe: defaulted.length ? `{ ${defaulted.join(", ")} }` : null,
    open,
  };
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

/**
 * Analyze the store reference names.
 * Insert type definitions code to provide correct type information for variables that begin with `$`.
 */
function analyzeStoreReferenceNames(
  result: TSESParseForESLintResult,
  svelteParseContext: SvelteParseContext,
  ctx: VirtualTypeScriptContext,
) {
  const globals = getGlobalsForSvelte(svelteParseContext);
  const scopeManager = result.scopeManager;
  const programScope = getProgramScope(
    scopeManager as eslint.Scope.ScopeManager,
  );
  const maybeStoreRefNames = new Set<string>();

  for (const reference of scopeManager.globalScope!.through) {
    if (
      // Begin with `$`.
      reference.identifier.name.startsWith("$") &&
      // Ignore globals
      !globals.includes(reference.identifier.name as never) &&
      // Ignore if it is already defined.
      !programScope.set.has(reference.identifier.name)
    ) {
      maybeStoreRefNames.add(reference.identifier.name);
    }
  }

  if (maybeStoreRefNames.size) {
    const storeValueTypeName = ctx.generateUniqueId("StoreValueType");
    ctx.appendVirtualScript(
      `type ${storeValueTypeName}<T> = T extends null | undefined
? T
: T extends object & { subscribe(run: infer F, ...args: any): any }
? F extends (value: infer V, ...args: any) => any
? V
: never
: T;`,
    );
    ctx.restoreContext.addRestoreStatementProcess((node, result) => {
      if (
        node.type !== "TSTypeAliasDeclaration" ||
        node.id.name !== storeValueTypeName
      ) {
        return false;
      }
      const program = result.ast;
      program.body.splice(program.body.indexOf(node), 1);

      const scopeManager = result.scopeManager as eslint.Scope.ScopeManager;
      // Remove `type` scope
      removeAllScopeAndVariableAndReference(node, {
        visitorKeys: result.visitorKeys,
        scopeManager,
      });
      return true;
    });

    for (const nm of maybeStoreRefNames) {
      const realName = nm.slice(1);
      ctx.appendVirtualScript(
        `declare let ${nm}: ${storeValueTypeName}<typeof ${realName}>;`,
      );
      ctx.restoreContext.addRestoreStatementProcess((node, result) => {
        if (
          node.type !== "VariableDeclaration" ||
          !node.declare ||
          node.declarations.length !== 1 ||
          node.declarations[0].id.type !== "Identifier" ||
          node.declarations[0].id.name !== nm
        ) {
          return false;
        }
        const program = result.ast;
        program.body.splice(program.body.indexOf(node), 1);

        const scopeManager = result.scopeManager as eslint.Scope.ScopeManager;

        // Remove `declare` variable
        removeAllScopeAndVariableAndReference(node, {
          visitorKeys: result.visitorKeys,
          scopeManager,
        });

        return true;
      });
    }
  }
}

/**
 * Analyze `$$slots`, `$$props`, and `$$restProps` .
 * Insert type definitions code to provide correct type information for `$$slots`, `$$props`, and `$$restProps`.
 */
function analyzeDollarDollarVariables(
  result: TSESParseForESLintResult,
  ctx: VirtualTypeScriptContext,
  svelteParseContext: SvelteParseContext,
  slots: Set<SvelteHTMLElement>,
) {
  const globals = getGlobalsForSvelte(svelteParseContext);
  const scopeManager = result.scopeManager;
  for (const globalName of globals) {
    if (
      !scopeManager.globalScope!.through.some(
        (reference) => reference.identifier.name === globalName,
      )
    ) {
      continue;
    }
    switch (globalName) {
      case "$$props":
        appendDeclareVirtualScript(globalName, `{ [index: string]: any }`);
        break;
      case "$$restProps":
        appendDeclareVirtualScript(globalName, `{ [index: string]: any }`);
        break;
      case "$$slots": {
        const nameTypes = new Set<string>();
        for (const slot of slots) {
          const nameAttr = slot.startTag.attributes.find(
            (attr): attr is SvelteAttribute =>
              attr.type === "SvelteAttribute" && attr.key.name === "name",
          );
          if (!nameAttr || nameAttr.value.length === 0) {
            nameTypes.add('"default"');
            continue;
          }

          if (nameAttr.value.length === 1) {
            const value = nameAttr.value[0];
            if (value.type === "SvelteLiteral") {
              nameTypes.add(JSON.stringify(value.value));
            } else {
              nameTypes.add("string");
            }
            continue;
          }
          nameTypes.add(
            `\`${nameAttr.value
              .map((value) =>
                value.type === "SvelteLiteral"
                  ? value.value.replace(/([$`])/gu, "\\$1")
                  : "${string}",
              )
              .join("")}\``,
          );
        }

        appendDeclareVirtualScript(
          globalName,
          `Record<${
            nameTypes.size > 0 ? [...nameTypes].join(" | ") : "any"
          }, boolean>`,
        );
        break;
      }
      case "$state":
      case "$derived":
      case "$effect":
      case "$props":
      case "$bindable":
      case "$inspect":
      case "$host":
        // Processed by `analyzeRuneVariables`.
        break;
      default: {
        const _: never = globalName;
        throw Error(`Unknown global: ${_}`);
      }
    }
  }

  /** Append declare virtual script */
  function appendDeclareVirtualScript(name: string, type: string) {
    ctx.appendVirtualScript(`declare let ${name}: ${type};`);
    ctx.restoreContext.addRestoreStatementProcess((node, result) => {
      if (
        node.type !== "VariableDeclaration" ||
        !node.declare ||
        node.declarations.length !== 1 ||
        node.declarations[0].id.type !== "Identifier" ||
        node.declarations[0].id.name !== name
      ) {
        return false;
      }
      const program = result.ast;
      program.body.splice(program.body.indexOf(node), 1);

      const scopeManager = result.scopeManager as eslint.Scope.ScopeManager;

      // Remove `declare` variable
      removeAllScopeAndVariableAndReference(node, {
        visitorKeys: result.visitorKeys,
        scopeManager,
      });

      return true;
    });
  }
}

/** Append dummy export */
function appendDummyExport(ctx: VirtualTypeScriptContext) {
  ctx.appendVirtualScript(`export namespace SvelteEslintParserModuleMarker {}`);
  ctx.restoreContext.addRestoreStatementProcess((node, result) => {
    if (
      node.type !== "ExportNamedDeclaration" ||
      node.declaration?.type !== "TSModuleDeclaration" ||
      node.declaration.kind !== "namespace" ||
      node.declaration.id.type !== "Identifier" ||
      node.declaration.id.name !== "SvelteEslintParserModuleMarker"
    ) {
      return false;
    }
    const program = result.ast;
    program.body.splice(program.body.indexOf(node), 1);

    const scopeManager = result.scopeManager as eslint.Scope.ScopeManager;

    // Remove `declare` variable
    removeAllScopeAndVariableAndReference(node, {
      visitorKeys: result.visitorKeys,
      scopeManager,
    });

    return true;
  });
}

/**
 * Analyze Runes.
 * Insert type definitions code to provide correct type information for Runes.
 */
function analyzeRuneVariables(
  result: TSESParseForESLintResult,
  ctx: VirtualTypeScriptContext,
  svelteParseContext: SvelteParseContext,
) {
  // No processing is needed if the user is determined not to be in Runes mode.
  if (svelteParseContext.runes === false) {
    return;
  }
  const scopeManager = result.scopeManager;
  for (const globalName of globalsForRunes) {
    if (
      !scopeManager.globalScope!.through.some(
        (reference) => reference.identifier.name === globalName,
      )
    ) {
      continue;
    }
    switch (globalName) {
      // See https://github.com/sveltejs/svelte/blob/bd2d3db6d0d7a931c2e84c38a5c537e30dda1dbe/packages/svelte/types/index.d.ts#L3124
      case "$state": {
        appendDeclareFunctionVirtualScripts(globalName, [
          "<T>(initial: T): T",
          "<T>(): T | undefined",
        ]);
        appendDeclareNamespaceVirtualScripts(globalName, [
          "export function eager<T>(value: T): T",
        ]);
        appendDeclareNamespaceVirtualScripts(globalName, [
          "export function raw<T>(initial: T): T;",
          "export function raw<T>(): T | undefined;",
        ]);
        appendDeclareNamespaceVirtualScripts(globalName, [
          "export function snapshot<T>(state: T): T;",
        ]);

        break;
      }
      // See https://github.com/sveltejs/svelte/blob/3fa3dd78a1cbaa88a1571977b76bf6f02ed4231d/packages/svelte/types/index.d.ts#L3247
      case "$derived": {
        appendDeclareFunctionVirtualScripts(globalName, [
          "<T>(expression: T): T",
        ]);
        appendDeclareNamespaceVirtualScripts(globalName, [
          "export function by<T>(fn: () => T): T;",
        ]);
        break;
      }
      // See https://github.com/sveltejs/svelte/blob/3fa3dd78a1cbaa88a1571977b76bf6f02ed4231d/packages/svelte/types/index.d.ts#L3307
      case "$effect": {
        appendDeclareFunctionVirtualScripts(globalName, [
          "(fn: () => void | (() => void)): void",
        ]);
        appendDeclareNamespaceVirtualScripts(globalName, [
          "export function pre(fn: () => void | (() => void)): void;",
          "export function pending(): number;",
          "export function tracking(): boolean;",
          "export function root(fn: () => void | (() => void)): () => void;",
        ]);
        break;
      }
      // See https://github.com/sveltejs/svelte/blob/3fa3dd78a1cbaa88a1571977b76bf6f02ed4231d/packages/svelte/types/index.d.ts#L3416
      case "$props": {
        // NOTE: In the Svelte repository's `index.d.ts`, the return type is any, but that triggers `@typescript-eslint/no-unsafe-assignment`. To avoid this, use generics here.
        appendDeclareFunctionVirtualScripts(globalName, ["<T>(): T"]);
        appendDeclareNamespaceVirtualScripts(globalName, [
          "export function id(): string;",
        ]);
        break;
      }
      // See https://github.com/sveltejs/svelte/blob/3fa3dd78a1cbaa88a1571977b76bf6f02ed4231d/packages/svelte/types/index.d.ts#L3459
      case "$bindable": {
        appendDeclareFunctionVirtualScripts(globalName, [
          "<T>(fallback?: T): T",
        ]);
        break;
      }
      // See https://github.com/sveltejs/svelte/blob/3fa3dd78a1cbaa88a1571977b76bf6f02ed4231d/packages/svelte/types/index.d.ts#L3502
      case "$inspect": {
        appendDeclareFunctionVirtualScripts(globalName, [
          `<T extends any[]>(...values: T): { with: (fn: (type: 'init' | 'update', ...values: T) => void) => void }`,
        ]);
        appendDeclareNamespaceVirtualScripts(globalName, [
          "export function trace(name?: string): void;",
        ]);
        break;
      }
      // See https://github.com/sveltejs/svelte/blob/3fa3dd78a1cbaa88a1571977b76bf6f02ed4231d/packages/svelte/types/index.d.ts#L3565
      case "$host": {
        appendDeclareFunctionVirtualScripts(globalName, [
          `<El extends HTMLElement = HTMLElement>(): El`,
        ]);
        break;
      }
      default: {
        const _: never = globalName;
        throw Error(`Unknown global: ${_}`);
      }
    }
  }

  /** Append declare virtual script */
  function appendDeclareFunctionVirtualScripts(name: string, types: string[]) {
    for (const type of types) {
      ctx.appendVirtualScript(`declare function ${name}${type};`);
      ctx.restoreContext.addRestoreStatementProcess((node, result) => {
        if (
          node.type !== "TSDeclareFunction" ||
          !node.declare ||
          node.id?.type !== "Identifier" ||
          node.id.name !== name
        ) {
          return false;
        }
        const program = result.ast;
        program.body.splice(program.body.indexOf(node), 1);

        const scopeManager = result.scopeManager as eslint.Scope.ScopeManager;

        // Remove `declare` variable
        removeAllScopeAndVariableAndReference(node, {
          visitorKeys: result.visitorKeys,
          scopeManager,
        });

        return true;
      });
    }
  }

  function appendDeclareNamespaceVirtualScripts(
    name: string,
    scripts: string[],
  ) {
    for (const script of scripts) {
      ctx.appendVirtualScript(`declare namespace ${name} { ${script} }`);
      ctx.restoreContext.addRestoreStatementProcess((node, result) => {
        if (
          node.type !== "TSModuleDeclaration" ||
          !node.declare ||
          node.id?.type !== "Identifier" ||
          node.id.name !== name
        ) {
          return false;
        }
        const program = result.ast;
        program.body.splice(program.body.indexOf(node), 1);

        const scopeManager = result.scopeManager as eslint.Scope.ScopeManager;

        // Remove `declare` variable
        removeAllScopeAndVariableAndReference(node, {
          visitorKeys: result.visitorKeys,
          scopeManager,
        });

        return true;
      });
    }
  }
}

/**
 * Analyze the reactive scopes.
 * Transform source code to provide the correct type information in the `$:` statements.
 */
function* analyzeReactiveScopes(
  result: TSESParseForESLintResult,
): Iterable<TransformInfo> {
  const scopeManager = result.scopeManager;
  const throughIds = scopeManager.globalScope!.through.map(
    (reference) => reference.identifier,
  );
  for (const statement of result.ast.body) {
    if (statement.type === "LabeledStatement" && statement.label.name === "$") {
      if (
        statement.body.type === "ExpressionStatement" &&
        statement.body.expression.type === "AssignmentExpression" &&
        statement.body.expression.operator === "=" &&
        // Must be a pattern that can be used in the LHS of variable declarations.
        // https://github.com/sveltejs/svelte-eslint-parser/issues/213
        (statement.body.expression.left.type === "Identifier" ||
          statement.body.expression.left.type === "ArrayPattern" ||
          statement.body.expression.left.type === "ObjectPattern")
      ) {
        const left = statement.body.expression.left;
        if (
          throughIds.some(
            (id) =>
              left.range[0] <= id.range[0] && id.range[1] <= left.range[1],
          )
        ) {
          const node = statement;
          const expression = statement.body.expression;
          yield {
            node,
            transform: (ctx) =>
              transformForDeclareReactiveVar(
                node,
                left,
                expression,
                result.ast.tokens,
                ctx,
              ),
          };
          continue;
        }
      }
      yield {
        node: statement,
        transform: (ctx) => transformForReactiveStatement(statement, ctx),
      };
    }
  }
}

/**
 * Analyze the $derived scopes.
 * Transform source code to provide the correct type information in the `$derived(...)` expression.
 */
function* analyzeDollarDerivedScopes(
  result: TSESParseForESLintResult,
  svelteParseContext: SvelteParseContext,
): Iterable<TransformInfo> {
  // No processing is needed if the user is determined not to be in Runes mode.
  if (svelteParseContext.runes === false) return;
  const scopeManager = result.scopeManager;
  const derivedReferences = scopeManager.globalScope!.through.filter(
    (reference) => reference.identifier.name === "$derived",
  );
  if (!derivedReferences.length) {
    return;
  }
  setParent(result);
  for (const ref of derivedReferences) {
    const derived = ref.identifier;
    if (
      derived.parent.type === "CallExpression" &&
      derived.parent.callee === derived &&
      derived.parent.arguments[0]?.type !== "SpreadElement"
    ) {
      const node = derived.parent;
      yield {
        node,
        transform: (ctx) => transformForDollarDerived(node, ctx),
      };
    }
  }
}

/**
 * Analyze the render scopes.
 * Transform source code to provide the correct type information in the HTML templates.
 */
function analyzeRenderScopes(
  code: SvelteTypeScriptCode,
  ctx: VirtualTypeScriptContext,
  analyzeInTemplate: () => void,
) {
  ctx.appendOriginal(code.script.length);
  const renderFunctionName = ctx.generateUniqueId("render");
  ctx.appendVirtualScript(`export function ${renderFunctionName}(){`);
  analyzeInTemplate();
  ctx.appendOriginal(code.script.length + code.render.length);
  ctx.appendVirtualScript(`}`);
  ctx.restoreContext.addRestoreStatementProcess((node, result) => {
    if (
      node.type !== "ExportNamedDeclaration" ||
      node.declaration?.type !== "FunctionDeclaration" ||
      node.declaration?.id?.name !== renderFunctionName
    ) {
      return false;
    }
    const program = result.ast;
    program.body.splice(
      program.body.indexOf(node),
      1,
      ...node.declaration.body.body,
    );
    for (const body of node.declaration.body.body) {
      body.parent = program;
    }

    const scopeManager = result.scopeManager as eslint.Scope.ScopeManager;
    removeFunctionScope(node.declaration, scopeManager);
    return true;
  });
}

/**
 * Applies the given transforms.
 * Note that intersecting transformations are not applied.
 */
function applyTransforms(
  transforms: TransformInfo[],
  ctx: VirtualTypeScriptContext,
) {
  transforms.sort((a, b) => a.node.range[0] - b.node.range[0]);

  let offset = 0;
  for (const transform of transforms) {
    const range = transform.node.range;
    if (offset <= range[0]) {
      transform.transform(ctx);
    }
    offset = range[1];
  }
}

/**
 * Transform for `$: id = ...` to `$: let id = ...`
 */
function transformForDeclareReactiveVar(
  statement: TSESTree.LabeledStatement,
  id: TSESTree.Identifier | TSESTree.ArrayPattern | TSESTree.ObjectPattern,
  expression: TSESTree.AssignmentExpression,
  tokens: TSESTree.Token[],
  ctx: VirtualTypeScriptContext,
): void {
  // e.g.
  //  From:
  //  $: id = x + y;
  //
  //  To:
  //  $: let id = fn()
  //  function fn () { let tmp; return (tmp = x + y); }
  //
  //
  //  From:
  //  $: ({id} = foo);
  //
  //  To:
  //  $: let {id} = fn()
  //  function fn () { let tmp; return (tmp = foo); }

  /**
   * The opening paren tokens for
   * `$: ({id} = foo);`
   *     ^
   */
  const openParens: TSESTree.Token[] = [];
  /**
   * The equal token for
   * `$: ({id} = foo);`
   *           ^
   */
  let eq: TSESTree.Token | null = null;
  /**
   * The closing paren tokens for
   * `$: ({id} = foo);`
   *                ^
   */
  const closeParens: TSESTree.Token[] = [];
  /**
   * The closing paren token for
   * `$: id = (foo);`
   *              ^
   */
  let expressionCloseParen: TSESTree.Token | null = null;
  const startIndex = sortedLastIndex(
    tokens,
    (target) => target.range[0] - statement.range[0],
  );
  for (let index = startIndex; index < tokens.length; index++) {
    const token = tokens[index];
    if (statement.range[1] <= token.range[0]) {
      break;
    }
    if (token.range[1] <= statement.range[0]) {
      continue;
    }
    if (token.value === "(" && token.range[1] <= expression.range[0]) {
      openParens.push(token);
    }
    if (
      token.value === "=" &&
      expression.left.range[1] <= token.range[0] &&
      token.range[1] <= expression.right.range[0]
    ) {
      eq = token;
    }
    if (token.value === ")") {
      if (expression.range[1] <= token.range[0]) {
        closeParens.push(token);
      } else if (expression.right.range[1] <= token.range[0]) {
        expressionCloseParen = token;
      }
    }
  }

  const functionId = ctx.generateUniqueId("reactiveVariableScopeFunction");
  const tmpVarId = ctx.generateUniqueId("tmpVar");
  for (const token of openParens) {
    ctx.appendOriginal(token.range[0]);
    ctx.skipOriginalOffset(token.range[1] - token.range[0]);
  }
  ctx.appendOriginal(expression.range[0]);
  ctx.skipUntilOriginalOffset(id.range[0]);
  ctx.appendVirtualScript("let ");
  ctx.appendOriginal(eq ? eq.range[1] : expression.right.range[0]);
  ctx.appendVirtualScript(
    `${functionId}();\nfunction ${functionId}(){let ${tmpVarId};return (${tmpVarId} = `,
  );
  ctx.appendOriginal(expression.right.range[1]);
  ctx.appendVirtualScript(`)`);
  for (const token of closeParens) {
    ctx.appendOriginal(token.range[0]);
    ctx.skipOriginalOffset(token.range[1] - token.range[0]);
  }
  ctx.appendOriginal(statement.range[1]);
  ctx.appendVirtualScript(`}`);

  ctx.restoreContext.addRestoreStatementProcess((node, result) => {
    if (node.type !== "SvelteReactiveStatement") {
      return false;
    }
    const reactiveStatement = node as never as TSESTree.LabeledStatement;
    if (
      reactiveStatement.body.type !== "VariableDeclaration" ||
      reactiveStatement.body.kind !== "let" ||
      reactiveStatement.body.declarations.length !== 1
    ) {
      return false;
    }
    const [idDecl] = reactiveStatement.body.declarations;
    if (
      idDecl.type !== "VariableDeclarator" ||
      idDecl.id.type !== id.type ||
      idDecl.init?.type !== "CallExpression" ||
      idDecl.init.callee.type !== "Identifier" ||
      idDecl.init.callee.name !== functionId
    ) {
      return false;
    }
    const program = result.ast;
    const nextIndex = program.body.indexOf(reactiveStatement) + 1;
    const fnDecl = program.body[nextIndex];
    if (
      !fnDecl ||
      fnDecl.type !== "FunctionDeclaration" ||
      fnDecl.id.name !== functionId ||
      fnDecl.body.body.length !== 2 ||
      fnDecl.body.body[0].type !== "VariableDeclaration" ||
      fnDecl.body.body[1].type !== "ReturnStatement"
    ) {
      return false;
    }
    const tmpVarDeclaration = fnDecl.body.body[0];
    if (
      tmpVarDeclaration.declarations.length !== 1 ||
      tmpVarDeclaration.declarations[0].type !== "VariableDeclarator"
    ) {
      return false;
    }
    const tempVarDeclId = tmpVarDeclaration.declarations[0].id;
    if (
      tempVarDeclId.type !== "Identifier" ||
      tempVarDeclId.name !== tmpVarId
    ) {
      return false;
    }
    const returnStatement = fnDecl.body.body[1];
    const assignment = returnStatement.argument;
    if (
      assignment?.type !== "AssignmentExpression" ||
      assignment.left.type !== "Identifier" ||
      assignment.right.type !== expression.right.type
    ) {
      return false;
    }
    const tempLeft = assignment.left;
    // Remove function declaration
    program.body.splice(nextIndex, 1);
    // Restore expression statement
    assignment.left = idDecl.id;
    assignment.loc = {
      start: idDecl.id.loc.start,
      end: expressionCloseParen
        ? expressionCloseParen.loc.end
        : assignment.right.loc.end,
    };
    assignment.range = [
      idDecl.id.range[0],
      expressionCloseParen
        ? expressionCloseParen.range[1]
        : assignment.right.range[1],
    ];
    idDecl.id.parent = assignment;
    const newBody: TSESTree.ExpressionStatement = {
      type: "ExpressionStatement" as TSESTree.ExpressionStatement["type"],
      expression: assignment,
      directive: undefined,
      loc: statement.body.loc,
      range: statement.body.range,
      parent: reactiveStatement,
    };
    assignment.parent = newBody;
    reactiveStatement.body = newBody;
    // Restore statement end location
    reactiveStatement.range[1] = returnStatement.range[1];
    reactiveStatement.loc.end.line = returnStatement.loc.end.line;
    reactiveStatement.loc.end.column = returnStatement.loc.end.column;

    // Restore tokens
    addElementsToSortedArray(
      program.tokens,
      [...openParens, ...closeParens],
      (a, b) => a.range[0] - b.range[0],
    );

    const scopeManager = result.scopeManager as eslint.Scope.ScopeManager;
    removeAllScopeAndVariableAndReference(tmpVarDeclaration, {
      visitorKeys: result.visitorKeys,
      scopeManager,
    });
    removeFunctionScope(fnDecl, scopeManager);

    const scope = getProgramScope(scopeManager);
    for (const reference of getAllReferences(idDecl.id, scope)) {
      reference.writeExpr = assignment.right as ESTree.Expression;
    }

    removeIdentifierReference(tempLeft, scope);
    removeIdentifierVariable(tempVarDeclId, scope);

    removeIdentifierReference(idDecl.init.callee, scope);
    removeIdentifierVariable(idDecl.id, scope);
    return true;
  });
}

/**
 * Transform for `$: ...` to `$: function foo(){...}`
 */
function transformForReactiveStatement(
  statement: TSESTree.LabeledStatement,
  ctx: VirtualTypeScriptContext,
) {
  const functionId = ctx.generateUniqueId("reactiveStatementScopeFunction");
  const originalBody = statement.body;
  ctx.appendOriginal(originalBody.range[0]);
  ctx.appendVirtualScript(`export function ${functionId}(){`);
  ctx.appendOriginal(originalBody.range[1]);
  ctx.appendVirtualScript(`}`);
  ctx.appendOriginal(statement.range[1]);

  ctx.restoreContext.addRestoreStatementProcess((node, result) => {
    if (node.type !== "SvelteReactiveStatement") {
      return false;
    }
    const reactiveStatement = node as never as TSESTree.LabeledStatement;
    const body = reactiveStatement.body;
    if (
      body.type !== "ExportNamedDeclaration" ||
      body.declaration?.type !== "FunctionDeclaration" ||
      body.declaration?.id?.name !== functionId
    ) {
      return false;
    }
    reactiveStatement.body = body.declaration.body.body[0];
    reactiveStatement.body.parent = reactiveStatement;

    const scopeManager = result.scopeManager as eslint.Scope.ScopeManager;
    removeFunctionScope(body.declaration, scopeManager);
    return true;
  });
}

/**
 * Transform for `$derived(expr)` to `$derived((()=>{ type This = typeof this;  return fn(); function fn (this: This) { return expr } })())`
 */
function transformForDollarDerived(
  derivedCall: TSESTree.CallExpression,
  ctx: VirtualTypeScriptContext,
) {
  const functionId = ctx.generateUniqueId("$derivedArgument");
  const thisTypeId = ctx.generateUniqueId("$This");
  const expression = derivedCall.arguments[0];
  ctx.appendOriginal(expression.range[0]);
  ctx.appendVirtualScript(
    `(()=>{type ${thisTypeId} = typeof this; return ${functionId}();function ${functionId}(this: ${thisTypeId}){return `,
  );
  ctx.appendOriginal(expression.range[1]);
  ctx.appendVirtualScript(`}})()`);

  ctx.restoreContext.addRestoreExpressionProcess<TSESTree.CallExpression>({
    target: "CallExpression" as TSESTree.AST_NODE_TYPES.CallExpression,
    restore: (node, result) => {
      if (
        node.callee.type !== "Identifier" ||
        node.callee.name !== "$derived"
      ) {
        return false;
      }
      const arg = node.arguments[0];
      if (
        !arg ||
        arg.type !== "CallExpression" ||
        arg.arguments.length !== 0 ||
        arg.callee.type !== "ArrowFunctionExpression" ||
        arg.callee.body.type !== "BlockStatement" ||
        arg.callee.body.body.length !== 3
      ) {
        return false;
      }
      const thisTypeNode = arg.callee.body.body[0];
      if (
        thisTypeNode.type !== "TSTypeAliasDeclaration" ||
        thisTypeNode.id.name !== thisTypeId
      ) {
        return false;
      }
      const returnNode = arg.callee.body.body[1];
      if (
        returnNode.type !== "ReturnStatement" ||
        returnNode.argument?.type !== "CallExpression" ||
        returnNode.argument.callee.type !== "Identifier" ||
        returnNode.argument.callee.name !== functionId
      ) {
        return false;
      }

      const fnNode = arg.callee.body.body[2];
      if (
        fnNode.type !== "FunctionDeclaration" ||
        fnNode.id.name !== functionId ||
        fnNode.body.body.length !== 1 ||
        fnNode.body.body[0].type !== "ReturnStatement" ||
        !fnNode.body.body[0].argument ||
        fnNode.params[0]?.type !== "Identifier" ||
        !fnNode.params[0].typeAnnotation ||
        fnNode.params[0].typeAnnotation.typeAnnotation.type !==
          "TSTypeReference" ||
        fnNode.params[0].typeAnnotation.typeAnnotation.typeName.type !==
          "Identifier"
      ) {
        return false;
      }

      const expr = fnNode.body.body[0].argument;

      node.arguments[0] = expr;
      expr.parent = node;

      const scopeManager = result.scopeManager as eslint.Scope.ScopeManager;
      const fnScope = scopeManager.acquire(fnNode as ESTree.Node)!;
      removeIdentifierVariable(fnNode.params[0], fnScope);
      removeIdentifierReference(
        fnNode.params[0].typeAnnotation.typeAnnotation.typeName,
        fnScope,
      );
      removeFunctionScope(fnNode, scopeManager);
      const scope = scopeManager.acquire(arg.callee as ESTree.Node)!;
      removeIdentifierVariable(thisTypeNode.id, scope);
      removeIdentifierReference(returnNode.argument.callee, scope);
      removeFunctionScope(arg.callee, scopeManager);
      return true;
    },
  });
}

/** Remove function scope and marge child scopes to upper scope */
function removeFunctionScope(
  node:
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression,
  scopeManager: eslint.Scope.ScopeManager,
) {
  const scope = scopeManager.acquire(node as ESTree.Node)!;
  const upper = scope.upper!;
  // Remove render function variable
  if (node.id) {
    removeIdentifierVariable(node.id, upper);
    removeIdentifierReference(node.id, upper);
  }

  replaceScope(scopeManager, scope, scope.childScopes);
  // Marge scope
  // * marge variables
  for (const variable of scope.variables) {
    if (variable.name === "arguments" && variable.defs.length === 0) {
      continue;
    }
    const upperVariable = upper.set.get(variable.name);
    if (upperVariable) {
      addElementsToSortedArray(
        upperVariable.identifiers,
        variable.identifiers,
        (a, b) => a.range![0] - b.range![0],
      );
      addElementsToSortedArray(
        upperVariable.defs,
        variable.defs,
        (a, b) => a.node.range![0] - b.node.range![0],
      );
      addAllReferences(upperVariable.references, variable.references);
    } else {
      upper.set.set(variable.name, variable);
      addVariable(upper.variables, variable);
      variable.scope = upper;
    }
    for (const reference of variable.references) {
      if (reference.from === scope) {
        reference.from = upper;
      }
      reference.resolved = upperVariable || variable;
    }
  }
  // * marge references
  addAllReferences(upper.references, scope.references);
  for (const reference of scope.references) {
    if (reference.from === scope) {
      reference.from = upper;
    }
  }
}
