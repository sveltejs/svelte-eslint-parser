import type ESTree from "estree"
import type { Scope, ScopeManager } from "eslint-scope"
import { Variable, Reference, analyze } from "eslint-scope"
import { getFallbackKeys } from "../traverse"
import type { SvelteReactiveStatement, SvelteScriptElement } from "../ast"
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

    return analyze(root, {
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
        reference.resolved = variable
        removeReferenceFromThrough(reference, referenceScope)
    }
}

/**
 * Analyze store scope. e.g. $count
 */
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

/** Transform props exports */
export function analyzePropsScope(
    body: SvelteScriptElement,
    scopeManager: ScopeManager,
): void {
    const moduleScope = scopeManager.scopes.find(
        (scope) => scope.type === "module",
    )
    if (!moduleScope) {
        return
    }

    for (const node of body.body) {
        if (node.type !== "ExportNamedDeclaration") {
            continue
        }
        if (node.declaration) {
            if (node.declaration.type === "VariableDeclaration") {
                for (const decl of node.declaration.declarations) {
                    if (decl.id.type === "Identifier") {
                        addPropsReference(decl.id, moduleScope)
                    }
                }
            }
        } else {
            for (const spec of node.specifiers) {
                addPropsReference(spec.local, moduleScope)
            }
        }
    }

    /** Add virtual props reference */
    function addPropsReference(node: ESTree.Identifier, scope: Scope) {
        for (const variable of scope.variables) {
            if (variable.name !== node.name) {
                continue
            }

            if (
                variable.references.some(
                    (ref) => (ref as any).sveltePropReference,
                )
            ) {
                continue
            }

            // Add the virtual reference for writing.
            const reference = new Reference()
            ;(reference as any).sveltePropReference = true
            reference.from = scope
            reference.identifier = {
                ...node,
                // @ts-expect-error -- ignore
                parent: body,
                loc: {
                    start: { ...node.loc!.start },
                    end: { ...node.loc!.end },
                },
                range: [...node.range!],
            }
            reference.isWrite = () => true
            reference.isWriteOnly = () => false
            reference.isRead = () => true
            reference.isReadOnly = () => false
            reference.isReadWrite = () => true

            variable.references.push(reference)
            reference.resolved = variable
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
                return false
            }
            return true
        })
        scope = scope.upper
    }
}

/** Get parent node */
function getParent(node: ESTree.Node): ESTree.Node | null {
    return (node as any).parent
}
