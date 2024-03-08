import type { TSESTree } from "@typescript-eslint/types";
import type { ScopeManager } from "eslint-scope";
import {
  addAllReferences,
  addVariable,
  getAllReferences,
  getProgramScope,
  removeAllScopeAndVariableAndReference,
  removeIdentifierReference,
  removeIdentifierVariable,
  replaceScope,
} from "../../../scope";
import { addElementsToSortedArray, sortedLastIndex } from "../../../utils";
import { parseScriptWithoutAnalyzeScope } from "../../script";
import { VirtualTypeScriptContext } from "../context";
import type { TSESParseForESLintResult } from "../types";
import type ESTree from "estree";
import type { SvelteAttribute, SvelteHTMLElement } from "../../../ast";
import { globals, globalsForRunes } from "../../../parser/globals";
import type { NormalizedParserOptions } from "../../parser-options";
import { setParent } from "../set-parent";

export type AnalyzeTypeScriptContext = {
  slots: Set<SvelteHTMLElement>;
};

type TransformInfo = {
  node: TSESTree.Node;
  transform: (ctx: VirtualTypeScriptContext) => void;
};

/**
 * Analyze TypeScript source code in <script>.
 * Generate virtual code to provide correct type information for Svelte store reference names, scopes, and runes.
 * See https://github.com/sveltejs/svelte-eslint-parser/blob/main/docs/internal-mechanism.md#scope-types
 */
export function analyzeTypeScriptInSvelte(
  code: { script: string; rootScope: string; render: string },
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
    {
      ...parserOptions,
      // Without typings
      project: null,
    },
  ) as unknown as TSESParseForESLintResult;

  ctx._beforeResult = result;

  analyzeStoreReferenceNames(result, ctx);

  analyzeDollarDollarVariables(result, ctx, context.slots);

  analyzeRuneVariables(result, ctx);

  applyTransforms(
    [...analyzeReactiveScopes(result), ...analyzeDollarDerivedScopes(result)],
    ctx,
  );

  analyzeRenderScopes(code, ctx);

  ctx.appendOriginalToEnd();

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
): VirtualTypeScriptContext {
  const ctx = new VirtualTypeScriptContext(code);
  ctx.appendOriginal(/^\s*/u.exec(code)![0].length);

  const result = parseScriptWithoutAnalyzeScope(code, attrs, {
    ...parserOptions,
    // Without typings
    project: null,
  }) as unknown as TSESParseForESLintResult;

  ctx._beforeResult = result;

  analyzeRuneVariables(result, ctx);

  applyTransforms([...analyzeDollarDerivedScopes(result)], ctx);

  ctx.appendOriginalToEnd();

  return ctx;
}

/**
 * Analyze the store reference names.
 * Insert type definitions code to provide correct type information for variables that begin with `$`.
 */
function analyzeStoreReferenceNames(
  result: TSESParseForESLintResult,
  ctx: VirtualTypeScriptContext,
) {
  const scopeManager = result.scopeManager;
  const programScope = getProgramScope(scopeManager as ScopeManager);
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

      const scopeManager = result.scopeManager as ScopeManager;
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

        const scopeManager = result.scopeManager as ScopeManager;

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
  slots: Set<SvelteHTMLElement>,
) {
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
      case "$inspect":
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

      const scopeManager = result.scopeManager as ScopeManager;

      // Remove `declare` variable
      removeAllScopeAndVariableAndReference(node, {
        visitorKeys: result.visitorKeys,
        scopeManager,
      });

      return true;
    });
  }
}

/**
 * Analyze Runes.
 * Insert type definitions code to provide correct type information for Runes.
 */
function analyzeRuneVariables(
  result: TSESParseForESLintResult,
  ctx: VirtualTypeScriptContext,
) {
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
      case "$state": {
        appendDeclareFunctionVirtualScripts(globalName, [
          "<T>(initial: T): T",
          "<T>(): T | undefined",
        ]);
        appendDeclareNamespaceVirtualScripts(globalName, [
          "export function frozen<T>(initial: T): Readonly<T>;",
          "export function frozen<T>(): Readonly<T> | undefined;",
        ]);
        break;
      }
      case "$derived": {
        appendDeclareFunctionVirtualScripts(globalName, [
          "<T>(expression: T): T",
        ]);
        appendDeclareNamespaceVirtualScripts(globalName, [
          "export function by<T>(fn: () => T): T;",
        ]);
        break;
      }
      case "$effect": {
        appendDeclareFunctionVirtualScripts(globalName, [
          "(fn: () => void | (() => void)): void",
        ]);
        appendDeclareNamespaceVirtualScripts(globalName, [
          "export function pre(fn: () => void | (() => void)): void;",
          "export function active(): boolean;",
          "export function root(fn: () => void | (() => void)): () => void;",
        ]);
        break;
      }
      case "$props": {
        appendDeclareFunctionVirtualScripts(globalName, ["<T>(): T"]);
        break;
      }
      case "$inspect": {
        appendDeclareFunctionVirtualScripts(globalName, [
          `<T extends any[]>(...values: T): { with: (fn: (type: 'init' | 'update', ...values: T) => void) => void }`,
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

        const scopeManager = result.scopeManager as ScopeManager;

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

        const scopeManager = result.scopeManager as ScopeManager;

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
                result.ast.tokens!,
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
): Iterable<TransformInfo> {
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
  code: { script: string; render: string; rootScope: string },
  ctx: VirtualTypeScriptContext,
) {
  ctx.appendOriginal(code.script.length);
  const renderFunctionName = ctx.generateUniqueId("render");
  ctx.appendVirtualScript(`function ${renderFunctionName}(){`);
  ctx.appendOriginal(code.script.length + code.render.length);
  ctx.appendVirtualScript(`}`);
  ctx.restoreContext.addRestoreStatementProcess((node, result) => {
    if (
      node.type !== "FunctionDeclaration" ||
      node.id.name !== renderFunctionName
    ) {
      return false;
    }
    const program = result.ast;
    program.body.splice(program.body.indexOf(node), 1, ...node.body.body);
    for (const body of node.body.body) {
      body.parent = program;
    }

    const scopeManager = result.scopeManager as ScopeManager;
    removeFunctionScope(node, scopeManager);
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
    if ((node as any).type !== "SvelteReactiveStatement") {
      return false;
    }
    const reactiveStatement = node as TSESTree.LabeledStatement;
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
    const nextIndex = program.body.indexOf(node) + 1;
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
      program.tokens!,
      [...openParens, ...closeParens],
      (a, b) => a.range[0] - b.range[0],
    );

    const scopeManager = result.scopeManager as ScopeManager;
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
  ctx.appendVirtualScript(`function ${functionId}(){`);
  ctx.appendOriginal(originalBody.range[1]);
  ctx.appendVirtualScript(`}`);
  ctx.appendOriginal(statement.range[1]);

  ctx.restoreContext.addRestoreStatementProcess((node, result) => {
    if ((node as any).type !== "SvelteReactiveStatement") {
      return false;
    }
    const reactiveStatement = node as TSESTree.LabeledStatement;
    const body = reactiveStatement.body;
    if (body.type !== "FunctionDeclaration" || body.id.name !== functionId) {
      return false;
    }
    reactiveStatement.body = body.body.body[0];
    reactiveStatement.body.parent = reactiveStatement;

    const scopeManager = result.scopeManager as ScopeManager;
    removeFunctionScope(body, scopeManager);
    return true;
  });
}

/**
 * Transform for `$derived(expr)` to `$derived((()=>{ return fn(); function fn () { return expr } })())`
 */
function transformForDollarDerived(
  derivedCall: TSESTree.CallExpression,
  ctx: VirtualTypeScriptContext,
) {
  const functionId = ctx.generateUniqueId("$derivedArgument");
  const expression = derivedCall.arguments[0];
  ctx.appendOriginal(expression.range[0]);
  ctx.appendVirtualScript(
    `(()=>{return ${functionId}();function ${functionId}(){return `,
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
        arg.callee.body.body.length !== 2 ||
        arg.callee.body.body[0].type !== "ReturnStatement" ||
        arg.callee.body.body[0].argument?.type !== "CallExpression" ||
        arg.callee.body.body[0].argument.callee.type !== "Identifier" ||
        arg.callee.body.body[0].argument.callee.name !== functionId ||
        arg.callee.body.body[1].type !== "FunctionDeclaration" ||
        arg.callee.body.body[1].id.name !== functionId
      ) {
        return false;
      }
      const fnNode = arg.callee.body.body[1];
      if (
        fnNode.body.body.length !== 1 ||
        fnNode.body.body[0].type !== "ReturnStatement" ||
        !fnNode.body.body[0].argument
      ) {
        return false;
      }

      const expr = fnNode.body.body[0].argument;

      node.arguments[0] = expr;
      expr.parent = node;

      const scopeManager = result.scopeManager as ScopeManager;
      removeFunctionScope(arg.callee.body.body[1], scopeManager);
      removeIdentifierReference(
        arg.callee.body.body[0].argument.callee,
        scopeManager.acquire(arg.callee)!,
      );
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
  scopeManager: ScopeManager,
) {
  const scope = scopeManager.acquire(node)!;
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
