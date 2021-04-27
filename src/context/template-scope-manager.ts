import type { Scope, ScopeManager } from "eslint-scope"
import type ESTree from "estree"

export class TemplateScopeManager {
    public readonly scopeManager: ScopeManager

    public readonly moduleScope: Scope

    public currentScope: Scope

    private readonly nodeToScope: WeakMap<ESTree.Node, Scope[]>

    public constructor(scopeManager: ScopeManager) {
        const moduleScope = scopeManager.globalScope.childScopes[0]
        this.scopeManager = scopeManager
        this.moduleScope = moduleScope
        this.currentScope = moduleScope

        // transform scopeManager
        const nodeToScope = (this.nodeToScope = new WeakMap<
            ESTree.Node,
            Scope[]
        >())
        for (const scope of this.scopeManager.scopes) {
            const scopes = this.nodeToScope.get(scope.block)
            if (scopes) {
                scopes.push(scope)
            } else {
                this.nodeToScope.set(scope.block, [scope])
            }
        }
        this.scopeManager.acquire = function (node, inner) {
            /**
             * predicate
             */
            function predicate(testScope: Scope) {
                if (
                    testScope.type === "function" &&
                    testScope.functionExpressionScope
                ) {
                    return false
                }
                return true
            }

            const scopes = nodeToScope.get(node as any)

            if (!scopes || scopes.length === 0) {
                return null
            }

            // Heuristic selection from all scopes.
            // If you would like to get all scopes, please use ScopeManager#acquireAll.
            if (scopes.length === 1) {
                return scopes[0]
            }

            if (inner) {
                for (let i = scopes.length - 1; i >= 0; --i) {
                    const scope = scopes[i]

                    if (predicate(scope)) {
                        return scope
                    }
                }
            } else {
                for (let i = 0, iz = scopes.length; i < iz; ++i) {
                    const scope = scopes[i]

                    if (predicate(scope)) {
                        return scope
                    }
                }
            }

            return null
        }
    }

    public nestBlockScope(node: any, type: "block" | "for" | "catch"): void {
        const upper = this.currentScope
        const newScope: Scope = {
            type,
            isStrict: true,
            upper,
            childScopes: [],
            variableScope: upper,
            block: node,
            variables: [],
            set: new Map(),
            references: [],
            through: [],
            functionExpressionScope: false,
        }
        this.currentScope = newScope

        //  variableScope = (this.type === "global" || this.type === "function" || this.type === "module") ? this : upperScope.variableScope;
    }

    public closeScope(): void {
        this.registerScope(this.currentScope)
        this.currentScope = this.currentScope.upper!
    }

    public registerScope(scope: Scope): void {
        this.scopeManager.scopes.push(scope)
        const scopes = this.nodeToScope.get(scope.block)
        if (scopes) {
            scopes.push(scope)
        } else {
            this.nodeToScope.set(scope.block, [scope])
        }
    }
}
