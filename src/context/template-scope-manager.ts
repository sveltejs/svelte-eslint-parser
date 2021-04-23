import type { Scope, ScopeManager } from "eslint-scope"

export class TemplateScopeManager {
    public readonly scopeManager: ScopeManager

    public readonly moduleScope: Scope

    public currentScope: Scope

    public constructor(scopeManager: ScopeManager) {
        const moduleScope = scopeManager.globalScope.childScopes[0]
        this.scopeManager = scopeManager
        this.moduleScope = moduleScope
        this.currentScope = moduleScope
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
        this.scopeManager.scopes.push(newScope)

        //  variableScope = (this.type === "global" || this.type === "function" || this.type === "module") ? this : upperScope.variableScope;
    }

    public closeScope(): void {
        this.currentScope = this.currentScope.upper!
    }
}
