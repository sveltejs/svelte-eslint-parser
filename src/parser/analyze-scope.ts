import type ESTree from "estree"
import type { Reference, Scope, ScopeManager } from "eslint-scope"
import { Variable } from "eslint-scope"
import eslintScope from "eslint-scope"
import { getFallbackKeys } from "../traverse"
import type { SvelteReactiveStatement } from "../ast"
/**
 * Analyze scope
 */
export function analyzeScope(
    node: ESTree.Node,
    parserOptions: any = {},
): ScopeManager {
    const ecmaVersion = parserOptions.ecmaVersion || 2020
    const ecmaFeatures = parserOptions.ecmaFeatures || {}
    const sourceType = parserOptions.sourceType || "module"

    const root: ESTree.Program =
        node.type === "Program"
            ? node
            : {
                  type: "Program",
                  body: [node as ESTree.Statement],
                  sourceType,
              }

    return eslintScope.analyze(root, {
        ignoreEval: true,
        nodejsScope: false,
        impliedStrict: ecmaFeatures.impliedStrict,
        ecmaVersion,
        sourceType,
        fallback: getFallbackKeys,
    })
}

/** Analyze reactive scope */
export function analyzeReactiveScope(scopeManager: ScopeManager): void {
    for (const reference of [...scopeManager.globalScope.through]) {
        const parent = getParent(reference.identifier)
        if (parent?.type === "AssignmentExpression") {
            const pp = getParent(parent)
            if (pp?.type === "ExpressionStatement") {
                const ppp = getParent(pp) as
                    | ESTree.Node
                    | SvelteReactiveStatement
                if (
                    ppp?.type === "SvelteReactiveStatement" &&
                    ppp.label.name === "$"
                ) {
                    const referenceScope: Scope = reference.from
                    if (referenceScope.type === "module") {
                        // It is computed
                        transformComputedVariable(parent, ppp, reference)
                        continue
                    }
                }
            }
        }
    }

    /** Get parent node */
    function getParent(node: ESTree.Node): ESTree.Node | null {
        return (node as any).parent
    }

    /** Transform ref to ComputedVariable */
    function transformComputedVariable(
        node: ESTree.AssignmentExpression,
        parent: SvelteReactiveStatement,
        reference: Reference,
    ) {
        const referenceScope: Scope = reference.from
        const name = reference.identifier.name
        let variable = referenceScope.set.get(name)
        if (!variable) {
            variable = new Variable()
            ;(variable as any).scope = referenceScope
            variable.name = name
            variable.defs.push({
                type: "ComputedVariable" as "Variable",
                node: node as any,
                parent: parent as any,
                name: reference.identifier,
            })
            referenceScope.variables.push(variable)
            referenceScope.set.set(name, variable)
        }
        variable.identifiers.push(reference.identifier)
        variable.references.push(reference)
        reference.resolved = variable
        removeReferenceFromThrough(reference, referenceScope)
    }
}

/** Analyze store scope */
export function analyzeStoreScope(scopeManager: ScopeManager): void {
    for (const reference of [...scopeManager.globalScope.through]) {
        if (reference.identifier.name.startsWith("$")) {
            const realName = reference.identifier.name.slice(1)
            const moduleScope = scopeManager.scopes.find(
                (scope) => scope.type === "module",
            )
            if (moduleScope) {
                const variable = moduleScope?.set.get(realName)
                if (variable) {
                    // It does not write directly to the original variable.
                    // Therefore, this variable is always a reference.
                    reference.isWrite = () => false
                    reference.isWriteOnly = () => false
                    reference.isReadWrite = () => false
                    reference.isReadOnly = () => true
                    reference.isRead = () => true

                    variable.references.push(reference)
                    reference.resolved = variable
                    removeReferenceFromThrough(reference, moduleScope)
                }
            }
        }
    }
}

/** Remove reference from through */
function removeReferenceFromThrough(reference: Reference, baseScope: Scope) {
    const variable = reference.resolved!
    const name = reference.identifier.name
    let scope: Scope | null = baseScope
    while (scope) {
        scope.through = scope.through.filter((ref) => {
            if (reference === ref) {
                return false
            } else if (ref.identifier.name === name) {
                ref.resolved = variable
                if (!variable.references.includes(ref)) {
                    variable.references.push(ref)
                }
                if (!variable.identifiers.includes(ref.identifier)) {
                    variable.identifiers.push(ref.identifier)
                }
                return false
            }
            return true
        })
        scope = scope.upper
    }
}
