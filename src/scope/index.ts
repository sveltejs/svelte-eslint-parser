import type { ScopeManager, Scope, Reference, Variable } from "eslint-scope";
import type * as ESTree from "estree";
import type { TSESTree } from "@typescript-eslint/types";
import { traverseNodes } from "../traverse";
import { addElementsToSortedArray, addElementToSortedArray } from "../utils";

/** Remove all scope, variable, and reference */
export function removeAllScopeAndVariableAndReference(
  target: ESTree.Node | TSESTree.Node,
  info: {
    visitorKeys?:
      | { [type: string]: string[] }
      | {
          readonly [type: string]: readonly string[] | undefined;
        };
    scopeManager: ScopeManager;
  }
): void {
  const targetScopes = new Set<Scope>();
  traverseNodes(target, {
    visitorKeys: info.visitorKeys,
    enterNode(node) {
      const scope = info.scopeManager.acquire(node);
      if (scope) {
        targetScopes.add(scope);
        return;
      }
      if (node.type === "Identifier") {
        let scope = getInnermostScopeFromNode(info.scopeManager, node);
        while (
          scope &&
          scope.block.type !== "Program" &&
          target.range![0] <= scope.block.range![0] &&
          scope.block.range![1] <= target.range![1]
        ) {
          scope = scope.upper!;
        }
        if (targetScopes.has(scope)) {
          return;
        }

        removeIdentifierVariable(node, scope);
        removeIdentifierReference(node, scope);
      }
    },
    leaveNode() {
      // noop
    },
  });

  for (const scope of targetScopes) {
    removeScope(info.scopeManager, scope);
  }
}

/**
 * Gets the scope for the current node
 */
export function getScopeFromNode(
  scopeManager: ScopeManager,
  currentNode: ESTree.Node
): Scope {
  let node: ESTree.Node | null = currentNode;
  for (; node; node = (node as any).parent || null) {
    const scope = scopeManager.acquire(node, false);
    if (scope) {
      if (scope.type === "function-expression-name") {
        return scope.childScopes[0];
      }
      if (
        scope.type === "global" &&
        node.type === "Program" &&
        node.sourceType === "module"
      ) {
        return scope.childScopes.find((s) => s.type === "module") || scope;
      }
      return scope;
    }
  }
  const global = scopeManager.globalScope;
  return global;
}
/**
 * Gets the scope for the Program node
 */
export function getProgramScope(scopeManager: ScopeManager): Scope {
  const globalScope = scopeManager.globalScope;
  return (
    globalScope.childScopes.find((s) => s.type === "module") || globalScope
  );
}

/**
 * Get the innermost scope which contains a given node.
 * @returns The innermost scope.
 */
export function getInnermostScopeFromNode(
  scopeManager: ScopeManager,
  currentNode: ESTree.Node
): Scope {
  return getInnermostScope(
    getScopeFromNode(scopeManager, currentNode),
    currentNode
  );
}

/**
 * Get the innermost scope which contains a given location.
 * @param initialScope The initial scope to search.
 * @param node The location to search.
 * @returns The innermost scope.
 */
export function getInnermostScope(
  initialScope: Scope,
  node: ESTree.Node
): Scope {
  const location = node.range![0];
  const isInRange =
    node.range![0] === node.range![1]
      ? (range: [number, number]) =>
          range[0] <= location && location <= range[1]
      : (range: [number, number]) =>
          range[0] <= location && location < range[1];

  for (const childScope of initialScope.childScopes) {
    const range = childScope.block.range!;

    if (isInRange(range)) {
      return getInnermostScope(childScope, node);
    }
  }

  return initialScope;
}

/* eslint-disable complexity -- ignore X( */
/** Remove variable */
export function removeIdentifierVariable(
  /* eslint-enable complexity -- ignore X( */
  node:
    | ESTree.Pattern
    | TSESTree.BindingName
    | TSESTree.RestElement
    | TSESTree.DestructuringPattern,
  scope: Scope
): void {
  if (node.type === "ObjectPattern") {
    for (const prop of node.properties) {
      if (prop.type === "Property") {
        removeIdentifierVariable(prop.value, scope);
      } else if (prop.type === "RestElement") {
        removeIdentifierVariable(prop, scope);
      }
    }
    return;
  }
  if (node.type === "ArrayPattern") {
    for (const element of node.elements) {
      if (!element) continue;
      removeIdentifierVariable(element, scope);
    }
    return;
  }
  if (node.type === "AssignmentPattern") {
    removeIdentifierVariable(node.left, scope);
    return;
  }
  if (node.type === "RestElement") {
    removeIdentifierVariable(node.argument, scope);
    return;
  }
  if (node.type === "MemberExpression") {
    return;
  }
  if (node.type !== "Identifier") {
    return;
  }
  for (let varIndex = 0; varIndex < scope.variables.length; varIndex++) {
    const variable = scope.variables[varIndex];
    const defIndex = variable.defs.findIndex((def) => def.name === node);
    if (defIndex < 0) {
      continue;
    }
    variable.defs.splice(defIndex, 1);
    if (variable.defs.length === 0) {
      // Remove variable
      referencesToThrough(variable.references, scope);
      variable.references.forEach((r) => {
        if (r.init) r.init = false;
        r.resolved = null;
      });
      scope.variables.splice(varIndex, 1);
      const name = node.name;
      if (variable === scope.set.get(name)) {
        scope.set.delete(name);
      }
    } else {
      const idIndex = variable.identifiers.indexOf(node);
      if (idIndex >= 0) {
        variable.identifiers.splice(idIndex, 1);
      }
    }
    return;
  }
}

/** Get all references */
export function* getAllReferences(
  node:
    | ESTree.Pattern
    | TSESTree.BindingName
    | TSESTree.RestElement
    | TSESTree.DestructuringPattern,
  scope: Scope
): Iterable<Reference> {
  if (node.type === "ObjectPattern") {
    for (const prop of node.properties) {
      if (prop.type === "Property") {
        yield* getAllReferences(prop.value, scope);
      } else if (prop.type === "RestElement") {
        yield* getAllReferences(prop, scope);
      }
    }
    return;
  }
  if (node.type === "ArrayPattern") {
    for (const element of node.elements) {
      if (!element) continue;
      yield* getAllReferences(element, scope);
    }
    return;
  }
  if (node.type === "AssignmentPattern") {
    yield* getAllReferences(node.left, scope);
    return;
  }
  if (node.type === "RestElement") {
    yield* getAllReferences(node.argument, scope);
    return;
  }
  if (node.type === "MemberExpression") {
    return;
  }
  if (node.type !== "Identifier") {
    return;
  }

  const ref = scope.references.find((ref) => ref.identifier === node);
  if (ref) yield ref;
}

/** Remove reference */
export function removeIdentifierReference(
  node: ESTree.Identifier,
  scope: Scope
): boolean {
  const reference = scope.references.find((ref) => ref.identifier === node);
  if (reference) {
    removeReference(reference, scope);
    return true;
  }
  const location = node.range![0];

  const pendingScopes = [];
  for (const childScope of scope.childScopes) {
    const range = childScope.block.range!;

    if (range[0] <= location && location < range[1]) {
      if (removeIdentifierReference(node, childScope)) {
        return true;
      }
    } else {
      pendingScopes.push(childScope);
    }
  }
  for (const childScope of pendingScopes) {
    if (removeIdentifierReference(node, childScope)) {
      return true;
    }
  }
  return false;
}

/** Remove reference */
export function removeReference(reference: Reference, baseScope: Scope): void {
  if (reference.resolved) {
    if (reference.resolved.defs.some((d) => d.name === reference.identifier)) {
      // remove var
      const varIndex = baseScope.variables.indexOf(reference.resolved);
      if (varIndex >= 0) {
        baseScope.variables.splice(varIndex, 1);
      }
      const name = reference.identifier.name;
      if (reference.resolved === baseScope.set.get(name)) {
        baseScope.set.delete(name);
      }
    } else {
      const refIndex = reference.resolved.references.indexOf(reference);
      if (refIndex >= 0) {
        reference.resolved.references.splice(refIndex, 1);
      }
    }
  }

  let scope: Scope | null = baseScope;
  while (scope) {
    const refIndex = scope.references.indexOf(reference);
    if (refIndex >= 0) {
      scope.references.splice(refIndex, 1);
    }
    const throughIndex = scope.through.indexOf(reference);
    if (throughIndex >= 0) {
      scope.through.splice(throughIndex, 1);
    }
    scope = scope.upper;
  }
}

/** Move reference to through */
function referencesToThrough(references: Reference[], baseScope: Scope) {
  let scope: Scope | null = baseScope;
  while (scope) {
    addAllReferences(scope.through, references);
    scope = scope.upper;
  }
}

/** Remove scope */
export function removeScope(scopeManager: ScopeManager, scope: Scope): void {
  for (const childScope of scope.childScopes) {
    removeScope(scopeManager, childScope);
  }

  while (scope.references[0]) {
    removeReference(scope.references[0], scope);
  }
  const upper = scope.upper;
  if (upper) {
    const index = upper.childScopes.indexOf(scope);
    if (index >= 0) {
      upper.childScopes.splice(index, 1);
    }
  }
  const index = scopeManager.scopes.indexOf(scope);
  if (index >= 0) {
    scopeManager.scopes.splice(index, 1);
  }
}
/** Replace scope */
export function replaceScope(
  scopeManager: ScopeManager,
  scope: Scope,
  newChildScopes: Scope[] = []
): void {
  // remove scope from scopeManager
  scopeManager.scopes = scopeManager.scopes.filter((s) => s !== scope);

  const upper = scope.upper;
  if (upper) {
    // remove scope from upper and marge childScopes
    upper.childScopes.splice(
      upper.childScopes.indexOf(scope),
      1,
      ...newChildScopes
    );
    for (const child of newChildScopes) {
      child.upper = upper;
      replaceVariableScope(child, scope);
    }
  }

  /** Replace variableScope  */
  function replaceVariableScope(child: Scope, replaceTarget: Scope) {
    if (child.variableScope === replaceTarget) {
      child.variableScope = child.upper!.variableScope;
      for (const c of child.childScopes) {
        replaceVariableScope(c, replaceTarget);
      }
    }
  }
}

/**
 * Add variable to array
 */
export function addVariable(list: Variable[], variable: Variable): void {
  addElementToSortedArray(list, variable, (a, b) => {
    const idA = getFirstId(a);
    const idB = getFirstId(b);
    return idA.range![0] - idB.range![0];
  });

  /** Get first id from give variable */
  function getFirstId(v: Variable): ESTree.Identifier {
    return v.identifiers[0] || v.defs[0]?.name || v.references[0]?.identifier;
  }
}
/**
 * Add reference to array
 */
export function addReference(list: Reference[], reference: Reference): void {
  addElementToSortedArray(
    list,
    reference,
    (a, b) => a.identifier.range![0] - b.identifier.range![0]
  );
}
/**
 * Add all references to array
 */
export function addAllReferences(
  list: Reference[],
  elements: Reference[]
): void {
  addElementsToSortedArray(
    list,
    elements,
    (a, b) => a.identifier.range![0] - b.identifier.range![0]
  );
}
