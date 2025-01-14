import type ESTree from "estree";
import type { Scope, ScopeManager } from "eslint-scope";
import { Variable, Reference, analyze } from "eslint-scope";
import { getFallbackKeys } from "../traverse.js";
import type {
  SvelteReactiveStatement,
  SvelteScriptElement,
  SvelteSnippetBlock,
} from "../ast/index.js";
import {
  addReference,
  addVariable,
  getScopeFromNode,
  removeIdentifierVariable,
} from "../scope/index.js";
import { addElementToSortedArray } from "../utils/index.js";
import type { NormalizedParserOptions } from "./parser-options.js";
import type { SvelteParseContext } from "./svelte-parse-context.js";
/**
 * Analyze scope
 */
export function analyzeScope(
  node: ESTree.Node,
  parserOptions: NormalizedParserOptions,
): ScopeManager {
  const ecmaVersion = parserOptions.ecmaVersion || 2020;
  const ecmaFeatures = parserOptions.ecmaFeatures || {};
  const sourceType = parserOptions.sourceType || "module";

  const root: ESTree.Program =
    node.type === "Program"
      ? node
      : {
          type: "Program",
          body: [node as ESTree.Statement],
          sourceType,
        };

  return analyze(root, {
    ignoreEval: true,
    nodejsScope: false,
    impliedStrict: ecmaFeatures.impliedStrict,
    ecmaVersion: typeof ecmaVersion === "number" ? ecmaVersion : 2022,
    sourceType,
    fallback: getFallbackKeys,
  });
}

/** Analyze reactive scope */
export function analyzeReactiveScope(scopeManager: ScopeManager): void {
  for (const reference of [...scopeManager.globalScope.through]) {
    const parent = reference.writeExpr && getParent(reference.writeExpr);
    if (parent?.type === "AssignmentExpression") {
      const pp = getParent(parent);
      if (pp?.type === "ExpressionStatement") {
        const ppp = getParent(pp) as ESTree.Node | SvelteReactiveStatement;
        if (ppp?.type === "SvelteReactiveStatement" && ppp.label.name === "$") {
          const referenceScope: Scope = reference.from;
          if (referenceScope.type === "module") {
            // It is computed
            transformComputedVariable(parent, ppp, reference);
            continue;
          }
        }
      }
    }
  }

  /** Transform ref to ComputedVariable */
  function transformComputedVariable(
    node: ESTree.AssignmentExpression,
    parent: SvelteReactiveStatement,
    reference: Reference,
  ) {
    const referenceScope: Scope = reference.from;
    const name = reference.identifier.name;
    let variable = referenceScope.set.get(name);
    if (!variable) {
      variable = new Variable();
      (variable as any).scope = referenceScope;
      variable.name = name;
      addElementToSortedArray(
        variable.defs,
        {
          type: "ComputedVariable" as "Variable",
          node: node as any,
          parent: parent as any,
          name: reference.identifier,
        },
        (a, b) => a.node.range[0] - b.node.range[0],
      );
      addVariable(referenceScope.variables, variable);
      referenceScope.set.set(name, variable);
    }
    addElementToSortedArray(
      variable.identifiers,
      reference.identifier,
      (a, b) => a.range![0] - b.range![0],
    );
    reference.resolved = variable;
    removeReferenceFromThrough(reference, referenceScope);
  }
}

/**
 * Analyze store scope. e.g. $count
 */
export function analyzeStoreScope(scopeManager: ScopeManager): void {
  const moduleScope = scopeManager.scopes.find(
    (scope) => scope.type === "module",
  );
  if (!moduleScope) {
    return;
  }
  const toBeMarkAsUsedReferences: Reference[] = [];

  for (const reference of [...scopeManager.globalScope.through]) {
    if (reference.identifier.name.startsWith("$")) {
      const realName = reference.identifier.name.slice(1);
      const variable = moduleScope.set.get(realName);
      if (variable) {
        if (reference.isWriteOnly()) {
          // Need mark as used
          toBeMarkAsUsedReferences.push(reference);
        }

        // It does not write directly to the original variable.
        // Therefore, this variable is always a reference.
        reference.isWrite = () => false;
        reference.isWriteOnly = () => false;
        reference.isReadWrite = () => false;
        reference.isReadOnly = () => true;
        reference.isRead = () => true;

        addReference(variable.references, reference);
        reference.resolved = variable;
        removeReferenceFromThrough(reference, moduleScope);
      }
    }
  }

  for (const variable of new Set(
    toBeMarkAsUsedReferences.map((ref) => ref.resolved!),
  )) {
    if (
      variable.references.some(
        (ref) =>
          !toBeMarkAsUsedReferences.includes(ref) &&
          ref.identifier !== variable.identifiers[0],
      )
    ) {
      // It is already used.
      continue;
    }

    // Add the virtual reference for reading.
    (
      addVirtualReference(variable.identifiers[0], variable, moduleScope, {
        read: true,
      }) as any
    ).svelteMarkAsUsed = true;
  }
}

/** Transform props exports */
export function analyzePropsScope(
  body: SvelteScriptElement,
  scopeManager: ScopeManager,
  svelteParseContext: SvelteParseContext,
): void {
  const moduleScope = scopeManager.scopes.find(
    (scope) => scope.type === "module",
  );
  if (!moduleScope) {
    return;
  }

  for (const node of body.body) {
    if (node.type === "ExportNamedDeclaration") {
      // Process for Svelte v4 style props. e.g. `export let x`;
      if (node.declaration) {
        if (node.declaration.type === "VariableDeclaration") {
          for (const decl of node.declaration.declarations) {
            for (const pattern of extractPattern(decl.id)) {
              if (pattern.type === "Identifier") {
                addPropReference(pattern, moduleScope);
              }
            }
          }
        }
      } else {
        for (const spec of node.specifiers) {
          if (spec.local.type !== "Literal") {
            addPropReference(spec.local, moduleScope);
          }
        }
      }
    } else if (node.type === "VariableDeclaration") {
      // Process if not confirmed as non-Runes mode.
      if (svelteParseContext.runes !== false) {
        // Process for Svelte v5 Runes props. e.g. `let { x = $bindable() } = $props()`;
        for (const decl of node.declarations) {
          if (
            decl.init?.type === "CallExpression" &&
            decl.init.callee.type === "Identifier" &&
            decl.init.callee.name === "$props" &&
            decl.id.type === "ObjectPattern"
          ) {
            for (const pattern of extractPattern(decl.id)) {
              if (
                pattern.type === "AssignmentPattern" &&
                pattern.left.type === "Identifier" &&
                pattern.right.type === "CallExpression" &&
                pattern.right.callee.type === "Identifier" &&
                pattern.right.callee.name === "$bindable"
              ) {
                addPropReference(pattern.left, moduleScope);
              }
            }
          }
        }
      }
    }
  }

  function* extractPattern(node: ESTree.Pattern): Iterable<ESTree.Pattern> {
    yield node;
    if (node.type === "Identifier") {
      return;
    }
    if (node.type === "ObjectPattern") {
      for (const prop of node.properties) {
        if (prop.type === "Property") {
          yield* extractPattern(prop.value);
        } else {
          yield* extractPattern(prop);
        }
      }
      return;
    }
    if (node.type === "ArrayPattern") {
      for (const elem of node.elements) {
        if (elem) {
          yield* extractPattern(elem);
        }
      }
      return;
    }
    if (node.type === "AssignmentPattern") {
      yield* extractPattern(node.left);
      return;
    }
    if (node.type === "RestElement") {
      yield* extractPattern(node.argument);
    }
  }

  /** Add virtual prop reference */
  function addPropReference(node: ESTree.Identifier, scope: Scope) {
    for (const variable of scope.variables) {
      if (variable.name !== node.name) {
        continue;
      }

      if (variable.references.some((ref) => (ref as any).sveltePropReference)) {
        continue;
      }

      // Add the virtual reference for writing.
      const reference = addVirtualReference(
        {
          ...node,
          // @ts-expect-error -- ignore
          parent: body,
          loc: {
            start: { ...node.loc!.start },
            end: { ...node.loc!.end },
          },
          range: [...node.range!],
        },
        variable,
        scope,
        {
          write: true,
          read: true,
        },
      );
      (reference as any).sveltePropReference = true;
    }
  }
}

/** Analyze snippets in component scope */
export function analyzeSnippetsScope(
  snippets: SvelteSnippetBlock[],
  scopeManager: ScopeManager,
): void {
  for (const snippet of snippets) {
    const parent = snippet.parent;
    if (
      parent.type === "SvelteElement" &&
      (parent.kind === "component" ||
        (parent.kind === "special" &&
          (parent.name.name === "svelte:component" ||
            parent.name.name === "svelte:boundary")))
    ) {
      const scope = getScopeFromNode(scopeManager, snippet.id);
      const upperScope = scope.upper;
      if (!upperScope) continue;
      const variable = upperScope.set.get(snippet.id.name);
      if (!variable) continue;
      const defIds = variable.defs.map((d) => d.name);
      const refs = variable.references.filter(
        (id) => !defIds.includes(id.identifier),
      );

      if (refs.length <= 0) {
        // If the snippet is not referenced,
        // remove the a variable from the upperScope.
        removeIdentifierVariable(snippet.id, upperScope);
      } else {
        // Add the virtual reference for reading.
        const reference = addVirtualReference(
          snippet.id,
          variable,
          upperScope,
          {
            read: true,
          },
        );
        (reference as any).svelteSnippetReference = true;
      }
    }
  }
}

/** Remove reference from through */
function removeReferenceFromThrough(reference: Reference, baseScope: Scope) {
  const variable = reference.resolved!;
  const name = reference.identifier.name;
  let scope: Scope | null = baseScope;
  while (scope) {
    scope.through = scope.through.filter((ref) => {
      if (reference === ref) {
        return false;
      } else if (ref.identifier.name === name) {
        ref.resolved = variable;
        if (!variable.references.includes(ref)) {
          addReference(variable.references, ref);
        }
        return false;
      }
      return true;
    });
    scope = scope.upper;
  }
}

/**
 * Add the virtual reference.
 */
function addVirtualReference(
  node: ESTree.Identifier,
  variable: Variable,
  scope: Scope,
  readWrite: { read?: boolean; write?: boolean },
) {
  const reference = new Reference();
  (reference as any).svelteVirtualReference = true;
  reference.from = scope;
  reference.identifier = node;
  reference.isWrite = () => Boolean(readWrite.write);
  reference.isWriteOnly = () => Boolean(readWrite.write) && !readWrite.read;
  reference.isRead = () => Boolean(readWrite.read);
  reference.isReadOnly = () => Boolean(readWrite.read) && !readWrite.write;
  reference.isReadWrite = () => Boolean(readWrite.read && readWrite.write);

  addReference(variable.references, reference);
  reference.resolved = variable;

  return reference;
}

/** Get parent node */
function getParent(node: ESTree.Node): ESTree.Node | null {
  return (node as any).parent;
}
