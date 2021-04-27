// eslint-disable-next-line eslint-comments/disable-enable-pair -- ignore
/* eslint-disable new-cap -- ignore */
import type { Scope } from "eslint-scope"
import type ESTree from "estree"
import type { Context } from "../../context"
import { getKeys } from "../../traverse"
import { analyzeScope } from "../analyze-scope"

/** Add operator token */
function addToken(index: number, text: string, ctx: Context) {
    const range = {
        start: index,
        end: index + text.length,
    }
    if (
        text === "of" ||
        text === "async" ||
        text === "await" ||
        text === "as" ||
        text === "from" ||
        text === "get" ||
        text === "set"
    ) {
        ctx.addToken("Identifier", range)
    } else if (/^[a-z]+$/i.test(text)) {
        ctx.addToken("Keyword", range)
    } else {
        ctx.addToken("Punctuator", range)
    }
}

const EXTRACT_TOKENS0 = {
    ArrayExpression() {
        /* noop */
    },
    ArrayPattern() {
        /* noop */
    },
    ArrowFunctionExpression(
        node: ESTree.ArrowFunctionExpression,
        ctx: Context,
    ) {
        const index = ctx.code.indexOf(
            "=>",
            getWithLoc(node.params[node.params.length - 1])?.end ??
                getWithLoc(node).start,
        )
        addToken(index, "=>", ctx)
    },
    AssignmentExpression(
        node:
            | ESTree.AssignmentExpression
            | ESTree.AssignmentPattern
            | ESTree.BinaryExpression
            | ESTree.LogicalExpression,
        ctx: Context,
    ) {
        const operator = node.type === "AssignmentPattern" ? "=" : node.operator
        const index = ctx.code.indexOf(operator, getWithLoc(node.left).end)
        addToken(index, operator, ctx)
    },
    AssignmentPattern(node: ESTree.AssignmentPattern, ctx: Context) {
        EXTRACT_TOKENS0.AssignmentExpression(node, ctx)
    },
    AwaitExpression(node: ESTree.AssignmentPattern, ctx: Context) {
        const index = ctx.code.indexOf("await", getWithLoc(node).start)
        addToken(index, "await", ctx)
    },
    BinaryExpression(node: ESTree.BinaryExpression, ctx: Context) {
        EXTRACT_TOKENS0.AssignmentExpression(node, ctx)
    },
    BlockStatement() {
        /* noop */
    },
    BreakStatement(node: ESTree.BreakStatement, ctx: Context) {
        const index = ctx.code.indexOf("break", getWithLoc(node).start)
        addToken(index, "break", ctx)
    },
    CallExpression(node: ESTree.SimpleCallExpression, ctx: Context) {
        if (node.optional) {
            const index = ctx.code.indexOf("?.", getWithLoc(node.callee).end)
            addToken(index, "?.", ctx)
        }
    },
    CatchClause(node: ESTree.CatchClause, ctx: Context) {
        const index = ctx.code.indexOf("catch", getWithLoc(node).start)
        addToken(index, "catch", ctx)
    },
    ChainExpression() {
        /* noop */
    },
    ClassBody() {
        /* noop */
    },
    ClassDeclaration(
        node: ESTree.ClassDeclaration | ESTree.ClassExpression,
        ctx: Context,
    ) {
        const classIndex = ctx.code.indexOf("class", getWithLoc(node).start)
        addToken(classIndex, "class", ctx)
        if (node.superClass) {
            const extendsIndex = ctx.code.lastIndexOf(
                "extends",
                getWithLoc(node.superClass).start,
            )
            addToken(extendsIndex, "extends", ctx)
        }
    },
    ClassExpression(node: ESTree.ClassExpression, ctx: Context) {
        EXTRACT_TOKENS0.ClassDeclaration(node, ctx)
    },
    ConditionalExpression() {
        /* noop */
    },
    ContinueStatement(node: ESTree.ContinueStatement, ctx: Context) {
        const index = ctx.code.indexOf("continue", getWithLoc(node).start)
        addToken(index, "continue", ctx)
    },
    DebuggerStatement(node: ESTree.DebuggerStatement, ctx: Context) {
        const index = ctx.code.indexOf("debugger", getWithLoc(node).start)
        addToken(index, "debugger", ctx)
    },
    DoWhileStatement(node: ESTree.DoWhileStatement, ctx: Context) {
        const doIndex = ctx.code.indexOf("do", getWithLoc(node).start)
        addToken(doIndex, "do", ctx)
        const whileIndex = ctx.code.lastIndexOf(
            "while",
            getWithLoc(node.test).start,
        )
        addToken(whileIndex, "while", ctx)
    },
    EmptyStatement() {
        /* noop */
    },
    ExportAllDeclaration(node: ESTree.ExportAllDeclaration, ctx: Context) {
        const exportIndex = ctx.code.indexOf("export", getWithLoc(node).start)
        addToken(exportIndex, "export", ctx)
        if ((node as any).exported) {
            const asIndex = ctx.code.lastIndexOf(
                "as",
                getWithLoc((node as any).exported).start,
            )
            addToken(asIndex, "as", ctx)
        }
        const fromIndex = ctx.code.lastIndexOf(
            "from",
            getWithLoc(node.source).start,
        )
        addToken(fromIndex, "from", ctx)
    },
    ExportDefaultDeclaration(
        node: ESTree.ExportDefaultDeclaration,
        ctx: Context,
    ) {
        const exportIndex = ctx.code.indexOf("export", getWithLoc(node).start)
        addToken(exportIndex, "export", ctx)
        const defaultIndex = ctx.code.indexOf("default", exportIndex + 6)
        addToken(defaultIndex, "default", ctx)
    },
    ExportNamedDeclaration(node: ESTree.ExportNamedDeclaration, ctx: Context) {
        const exportIndex = ctx.code.indexOf("export", getWithLoc(node).start)
        addToken(exportIndex, "export", ctx)
    },
    ExportSpecifier(node: ESTree.ExportSpecifier, ctx: Context) {
        if (node.local !== node.exported) {
            const asIndex = ctx.code.indexOf("as", getWithLoc(node.local).end)
            addToken(asIndex, "as", ctx)
        }
    },
    ExpressionStatement() {
        /* noop */
    },
    ForInStatement(
        node:
            | ESTree.ForInStatement
            | ESTree.ForOfStatement
            | ESTree.ForStatement,
        ctx: Context,
    ) {
        const forIndex = ctx.code.indexOf("for", getWithLoc(node).start)
        addToken(forIndex, "for", ctx)
        if (node.type === "ForOfStatement" && node.await) {
            const awaitIndex = ctx.code.indexOf("await", forIndex + 3)
            addToken(awaitIndex, "await", ctx)
        }
        if (node.type !== "ForStatement") {
            const keyword = node.type === "ForInStatement" ? "in" : "of"
            const keywordIndex = ctx.code.indexOf(
                keyword,
                getWithLoc(node.left).end,
            )
            addToken(keywordIndex, keyword, ctx)
        }
    },
    ForOfStatement(node: ESTree.ForOfStatement, ctx: Context) {
        EXTRACT_TOKENS0.ForInStatement(node, ctx)
    },
    ForStatement(node: ESTree.ForStatement, ctx: Context) {
        EXTRACT_TOKENS0.ForInStatement(node, ctx)
    },
    FunctionDeclaration(
        node: ESTree.FunctionDeclaration | ESTree.FunctionExpression,
        ctx: Context,
    ) {
        let start = getWithLoc(node).start
        if (node.async) {
            const index = ctx.code.indexOf("async", start)
            addToken(index, "async", ctx)
            start = index + 5
        }
        const index = ctx.code.indexOf("function", start)
        addToken(index, "function", ctx)
    },
    FunctionExpression(
        node: ESTree.FunctionExpression,
        ctx: Context,
        parent: ESTree.Node | null,
    ) {
        if (
            parent &&
            (parent.type === "MethodDefinition" ||
                (parent.type === "Property" &&
                    parent.value === node &&
                    (parent.method ||
                        parent.kind === "get" ||
                        parent.kind === "set")))
        ) {
            return
        }
        EXTRACT_TOKENS0.FunctionDeclaration(node, ctx)
    },
    Identifier(
        node: ESTree.Identifier,
        ctx: Context,
        parent: ESTree.Node | null,
    ) {
        if (parent?.type === "MetaProperty" && parent.meta === node) {
            ctx.addToken("Keyword", getWithLoc(node))
        } else {
            ctx.addToken("Identifier", getWithLoc(node))
        }
    },
    IfStatement(node: ESTree.IfStatement, ctx: Context) {
        const index = ctx.code.indexOf("if", getWithLoc(node).start)
        addToken(index, "if", ctx)
        if (node.alternate) {
            const elseIndex = ctx.code.lastIndexOf(
                "else",
                getWithLoc(node.alternate).start,
            )
            addToken(elseIndex, "else", ctx)
        }
    },
    ImportDeclaration(node: ESTree.ImportDeclaration, ctx: Context) {
        const importIndex = ctx.code.indexOf("import", getWithLoc(node).start)
        addToken(importIndex, "import", ctx)
        if (node.specifiers.length) {
            const fromIndex = ctx.code.lastIndexOf(
                "from",
                getWithLoc(node.source).start,
            )
            addToken(fromIndex, "from", ctx)
        }
    },
    ImportDefaultSpecifier() {
        /* noop */
    },
    ImportExpression(node: ESTree.ImportExpression, ctx: Context) {
        const importIndex = ctx.code.indexOf("import", getWithLoc(node).start)
        addToken(importIndex, "import", ctx)
    },
    ImportNamespaceSpecifier(
        node: ESTree.ImportNamespaceSpecifier,
        ctx: Context,
    ) {
        const asIndex = ctx.code.lastIndexOf("as", getWithLoc(node.local).end)
        addToken(asIndex, "as", ctx)
    },
    ImportSpecifier(node: ESTree.ImportSpecifier, ctx: Context) {
        if (node.local !== node.imported) {
            const asIndex = ctx.code.indexOf(
                "as",
                getWithLoc(node.imported).end,
            )
            addToken(asIndex, "as", ctx)
        }
    },
    LabeledStatement() {
        /* noop */
    },
    Literal(node: ESTree.Literal, ctx: Context) {
        if ("regex" in node) {
            const token = ctx.addToken("RegularExpression", getWithLoc(node))
            ;(token as any).regex = node.regex
        } else if ("bigint" in node) {
            ctx.addToken("Numeric", getWithLoc(node))
        } else if (node.value === null) {
            ctx.addToken("Null", getWithLoc(node))
        } else if (typeof node.value === "number") {
            ctx.addToken("Numeric", getWithLoc(node))
        } else if (typeof node.value === "string") {
            ctx.addToken("String", getWithLoc(node))
        } else if (typeof node.value === "boolean") {
            ctx.addToken("Boolean", getWithLoc(node))
        }
    },
    LogicalExpression(node: ESTree.LogicalExpression, ctx: Context) {
        EXTRACT_TOKENS0.AssignmentExpression(node, ctx)
    },
    MemberExpression(node: ESTree.MemberExpression, ctx: Context) {
        if (node.optional) {
            const index = ctx.code.indexOf("?.", getWithLoc(node.object).end)
            addToken(index, "?.", ctx)
        }
    },
    MetaProperty() {
        /* noop */
    },
    MethodDefinition(node: ESTree.MethodDefinition, ctx: Context) {
        let start = getWithLoc(node).start
        if (node.static) {
            const index = ctx.code.indexOf("static", start)
            addToken(index, "static", ctx)
            start = index + 6
        }
        if (node.value.async) {
            const index = ctx.code.indexOf("async", start)
            addToken(index, "async", ctx)
            start = index + 5
        }
        if (node.kind === "get" || node.kind === "set") {
            const index = ctx.code.indexOf(node.kind, start)
            addToken(index, node.kind, ctx)
        }
    },
    NewExpression(node: ESTree.NewExpression, ctx: Context) {
        const index = ctx.code.indexOf("new", getWithLoc(node).start)
        addToken(index, "new", ctx)
    },
    ObjectExpression() {
        /* noop */
    },
    ObjectPattern() {
        /* noop */
    },
    Program() {
        /* noop */
    },
    Property(node: ESTree.Property, ctx: Context) {
        const start = getWithLoc(node).start
        if (node.kind === "get" || node.kind === "set") {
            const index = ctx.code.indexOf(node.kind, start)
            addToken(index, node.kind, ctx)
        }
    },
    RestElement(node: ESTree.RestElement | ESTree.SpreadElement, ctx: Context) {
        const index = ctx.code.indexOf("...", getWithLoc(node).start)
        addToken(index, "...", ctx)
    },
    ReturnStatement(node: ESTree.ReturnStatement, ctx: Context) {
        const index = ctx.code.indexOf("return", getWithLoc(node).start)
        addToken(index, "return", ctx)
    },
    SequenceExpression() {
        /* noop */
    },
    SpreadElement(node: ESTree.SpreadElement, ctx: Context) {
        EXTRACT_TOKENS0.RestElement(node, ctx)
    },
    Super(node: ESTree.Super, ctx: Context) {
        const index = ctx.code.indexOf("super", getWithLoc(node).start)
        addToken(index, "super", ctx)
    },
    SwitchCase(node: ESTree.SwitchCase, ctx: Context) {
        if (node.test) {
            const index = ctx.code.indexOf("case", getWithLoc(node).start)
            addToken(index, "case", ctx)
        } else {
            const index = ctx.code.indexOf("default", getWithLoc(node).start)
            addToken(index, "default", ctx)
        }
    },
    SwitchStatement(node: ESTree.SwitchStatement, ctx: Context) {
        const index = ctx.code.indexOf("switch", getWithLoc(node).start)
        addToken(index, "switch", ctx)
    },
    TaggedTemplateExpression() {
        /* noop */
    },
    TemplateElement(
        node: ESTree.TemplateElement,
        ctx: Context,
        parent: ESTree.Node | null,
    ) {
        const literal: ESTree.TemplateLiteral = parent as never

        const start =
            literal.quasis[0] === node
                ? getWithLoc(literal).start
                : getWithLoc(node).start - 1
        const end =
            literal.quasis[literal.quasis.length - 1] === node
                ? getWithLoc(literal).end
                : getWithLoc(node).end + 2
        ctx.addToken("Template", { start, end })
    },
    TemplateLiteral() {
        /* noop */
    },
    ThisExpression(node: ESTree.ThisExpression, ctx: Context) {
        const index = ctx.code.indexOf("this", getWithLoc(node).start)
        addToken(index, "this", ctx)
    },
    ThrowStatement(node: ESTree.ThrowStatement, ctx: Context) {
        const index = ctx.code.indexOf("throw", getWithLoc(node).start)
        addToken(index, "throw", ctx)
    },
    TryStatement(node: ESTree.TryStatement, ctx: Context) {
        const index = ctx.code.indexOf("try", getWithLoc(node).start)
        addToken(index, "try", ctx)
    },
    UnaryExpression(node: ESTree.UnaryExpression, ctx: Context) {
        const index = ctx.code.lastIndexOf(
            node.operator,
            getWithLoc(node.argument).start - 1,
        )
        addToken(index, node.operator, ctx)
    },
    UpdateExpression(node: ESTree.UpdateExpression, ctx: Context) {
        const index = node.prefix
            ? ctx.code.lastIndexOf(
                  node.operator,
                  getWithLoc(node.argument).start - 1,
              )
            : ctx.code.indexOf(node.operator, getWithLoc(node.argument).end)
        addToken(index, node.operator, ctx)
    },
    VariableDeclaration(node: ESTree.VariableDeclaration, ctx: Context) {
        const index = ctx.code.indexOf(node.kind, getWithLoc(node).start)
        addToken(index, node.kind, ctx)
    },
    VariableDeclarator() {
        /* noop */
    },
    WhileStatement(node: ESTree.WhileStatement, ctx: Context) {
        const index = ctx.code.indexOf("while", getWithLoc(node).start)
        addToken(index, "while", ctx)
    },
    WithStatement(node: ESTree.WithStatement, ctx: Context) {
        const index = ctx.code.indexOf("with", getWithLoc(node).start)
        addToken(index, "with", ctx)
    },
    YieldExpression(node: ESTree.YieldExpression, ctx: Context) {
        const index = ctx.code.indexOf("yield", getWithLoc(node).start)
        addToken(index, "yield", ctx)
    },
}
const EXTRACT_TOKENS: {
    [key in ESTree.Node["type"]]: (
        node: any,
        ctx: Context,
        parent: ESTree.Node | null,
    ) => void
} = EXTRACT_TOKENS0

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ignore
export function convertESNode<N extends ESTree.Node>(
    node: null | undefined,
    parent: any,
    ctx: Context,
): null
export function convertESNode<N extends ESTree.Node>(
    node: N,
    parent: any,
    ctx: Context,
): N
export function convertESNode<N extends ESTree.Node>(
    node: N | null | undefined,
    parent: any,
    ctx: Context,
): N | null

/** Convert for ES */
export function convertESNode<N extends ESTree.Node>(
    node: N | null | undefined,
    parent: any,
    ctx: Context,
): N | null {
    return convertESNode0(node, parent, ctx)
}

/** Convert for ES */
function convertESNode0<N extends ESTree.Node>(
    node: N | null | undefined,
    parent: any,
    ctx: Context,
    extracted = new Set<ESTree.Node>(),
): N | null {
    if (!node) {
        return null
    }
    if (!extracted.has(node)) {
        EXTRACT_TOKENS[node.type]?.(node, ctx, parent)
        for (const comment of [
            ...(node.leadingComments || []),
            ...((node as any).innerComments || []),
            ...(node.trailingComments || []),
        ]) {
            ctx.addComment({
                type: comment.type,
                value: comment.value,
                ...ctx.getConvertLocation(getWithLoc(comment)),
            })
        }
        extracted.add(node)
    }

    const result = {
        ...node,
        parent,
        ...ctx.getConvertLocation(getWithLoc(node)),
    }

    for (const key of getKeys(node)) {
        const child = (node as any)[key]
        ;(result as any)[key] = Array.isArray(child)
            ? child.map((c) => convertESNode0(c, result, ctx, extracted))
            : convertESNode0(child, result, ctx, extracted)
    }

    return result as any
}

/** Analyze expression scope */
export function analyzeExpressionScope(
    node: ESTree.Expression,
    ctx: Context,
): void {
    const scopeManager = analyzeScope(node, ctx.parserOptions)
    const moduleScope = scopeManager.globalScope.childScopes[0]

    // Merge
    mergeScope(moduleScope, ctx)
}

/** Analyze pattern scope */
export function analyzePatternScope(node: ESTree.Pattern, ctx: Context): void {
    const fnNode: ESTree.FunctionExpression = {
        type: "FunctionExpression",
        body: { type: "BlockStatement", body: [] },
        params: [node],
    }
    const scopeManager = analyzeScope(fnNode, ctx.parserOptions)
    const moduleScope = scopeManager.globalScope.childScopes[0]
    const forScope = moduleScope.childScopes[0]

    forScope.variables = forScope.variables.filter((variable) => {
        if (variable.name === "arguments") {
            return false
        }
        for (const def of variable.defs) {
            if (def.node === fnNode) {
                def.node = (node as any).parent
            }
        }
        return true
    })

    // Merge
    mergeScope(forScope, ctx)
}

/** Merge scope */
function mergeScope(targetScope: Scope, ctx: Context) {
    const templateScopeManager = ctx.templateScopeManager

    for (const scope of targetScope.childScopes) {
        templateScopeManager.scopeManager.scopes.push(scope)
        templateScopeManager.currentScope.childScopes.push(scope)
        scope.upper = templateScopeManager.currentScope
    }
    for (const variable of targetScope.variables) {
        ;(variable as any).scope = templateScopeManager.currentScope
        templateScopeManager.currentScope.variables.push(variable)
        templateScopeManager.currentScope.set.set(variable.name, variable)
    }
    for (const reference of targetScope.references) {
        reference.from = templateScopeManager.currentScope
        templateScopeManager.currentScope.references.push(reference)
    }

    // Merge through
    for (const reference of targetScope.through) {
        let scope = templateScopeManager.currentScope
        let variable = scope.set.get(reference.identifier.name)
        while (!variable) {
            scope.through.push(reference)
            if (scope.upper) {
                scope = scope.upper
                variable = scope.set.get(reference.identifier.name)
                continue
            }
            break
        }
        if (variable) {
            reference.resolved = variable
            variable.references.push(reference)
        }
    }
}

export function getWithLoc<N extends ESTree.Comment>(
    node: N,
): N & { start: number; end: number }
export function getWithLoc<N extends ESTree.Node>(
    node: N,
): N & { start: number; end: number }
export function getWithLoc<N extends ESTree.Node>(
    node: N | null | undefined,
): (N & { start: number; end: number }) | null | undefined
/** Get node with location */
export function getWithLoc(node: any): { start: number; end: number } {
    return node
}
