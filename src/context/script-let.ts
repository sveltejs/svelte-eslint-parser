import type { ScopeManager, Scope } from "eslint-scope";
import type * as ESTree from "estree";
import type { TSESTree } from "@typescript-eslint/types";
import type { Scope as TSScope } from "@typescript-eslint/scope-manager";
import type { Context, ScriptsSourceCode } from ".";
import type {
  Comment,
  SvelteEachBlock,
  SvelteIfBlock,
  SvelteName,
  SvelteNode,
  SvelteSnippetBlock,
  Token,
} from "../ast";
import type { ESLintExtendedProgram } from "../parser";
import { getWithLoc } from "../parser/converts/common";
import {
  getScopeFromNode,
  removeAllScopeAndVariableAndReference,
  removeIdentifierVariable,
  removeReference,
  removeScope,
} from "../scope";
import { getKeys, traverseNodes, getNodes } from "../traverse";
import { UniqueIdGenerator } from "./unique";
import { fixLocations } from "./fix-locations";

type TSAsExpression = {
  type: "TSAsExpression";
  expression: ESTree.Expression;
  typeAnnotation: TSParenthesizedType | TSESTree.TypeNode;
};

// TS ESLint v4 Node
type TSParenthesizedType = {
  type: "TSParenthesizedType";
  typeAnnotation: TSESTree.TypeNode;
};

export type ScriptLetCallback<E extends ESTree.Node> = (
  es: E,
  options: ScriptLetCallbackOption,
) => void;

export type ScriptLetCallbackOption = {
  getScope: (node: ESTree.Node) => Scope;
  registerNodeToScope: (node: any, scope: Scope) => void;
  scopeManager: ScopeManager;
  visitorKeys?: { [type: string]: string[] };
};
export type ScriptLetRestoreCallback = (
  node: ESTree.Node,
  tokens: Token[],
  comments: Comment[],
  options: ScriptLetRestoreCallbackOption,
) => void;
type ScriptLetRestoreCallbackOption = {
  getScope: (node: ESTree.Node) => Scope;
  registerNodeToScope: (node: any, scope: Scope) => void;
  scopeManager: ScopeManager;
  visitorKeys?: { [type: string]: string[] };
  addPostProcess: (callback: () => void) => void;
};

/**
 * Get node range
 */
function getNodeRange(
  node:
    | ESTree.Node
    | {
        start: number;
        end: number;
        leadingComments?: Comment[];
        trailingComments?: Comment[];
      }
    | {
        range: [number, number];
        leadingComments?: Comment[];
        trailingComments?: Comment[];
      },
): [number, number] {
  let start = null;
  let end = null;
  if (node.leadingComments) {
    start = getWithLoc(node.leadingComments[0]).start;
  }
  if (node.trailingComments) {
    end = getWithLoc(
      node.trailingComments[node.trailingComments.length - 1],
    ).end;
  }

  const loc =
    "range" in node
      ? { start: node.range![0], end: node.range![1] }
      : getWithLoc(node);

  return [
    start ? Math.min(start, loc.start) : loc.start,
    end ? Math.max(end, loc.end) : loc.end,
  ];
}

type RestoreCallback = {
  start: number;
  end: number;
  callback: ScriptLetRestoreCallback;
};

type TypeGenHelper = { generateUniqueId: (base: string) => string };

type ObjectShorthandProperty = ESTree.Property & {
  key: ESTree.Identifier;
  value: ESTree.Identifier;
};

export type ScriptLetBlockParam = {
  node: ESTree.Pattern | SvelteName;
  parent: SvelteNode;
  typing: string;
  callback: (node: ESTree.Pattern, options: ScriptLetCallbackOption) => void;
};
/**
 * A class that handles script fragments.
 * The script fragment AST node remaps and connects to the original directive AST node.
 */
export class ScriptLetContext {
  private readonly script: ScriptsSourceCode;

  private readonly ctx: Context;

  private readonly restoreCallbacks: RestoreCallback[] = [];

  private readonly programRestoreCallbacks: ScriptLetRestoreCallback[] = [];

  private readonly closeScopeCallbacks: (() => void)[] = [];

  private readonly unique = new UniqueIdGenerator();

  private currentScriptScopeKind: "render" | "snippet" = "render";

  public constructor(ctx: Context) {
    this.script = ctx.sourceCode.scripts;
    this.ctx = ctx;
  }

  public addExpression<E extends ESTree.Expression>(
    expression: E | SvelteName,
    parent: SvelteNode,
    typing?: string | null,
    ...callbacks: ScriptLetCallback<E>[]
  ): ScriptLetCallback<E>[] {
    const range = getNodeRange(expression);
    return this.addExpressionFromRange(range, parent, typing, ...callbacks);
  }

  public addExpressionFromRange<E extends ESTree.Expression>(
    range: [number, number],
    parent: SvelteNode,
    typing?: string | null,
    ...callbacks: ScriptLetCallback<E>[]
  ): ScriptLetCallback<E>[] {
    const part = this.ctx.code.slice(...range);
    const isTS = typing && this.ctx.isTypeScript();
    this.appendScript(
      `(${part})${isTS ? `as (${typing})` : ""};`,
      range[0] - 1,
      this.currentScriptScopeKind,
      (st, tokens, comments, result) => {
        const exprSt = st as ESTree.ExpressionStatement;
        const tsAs: TSAsExpression | null = isTS
          ? (exprSt.expression as any)
          : null;
        const node: ESTree.Expression = tsAs?.expression || exprSt.expression;
        // Process for nodes
        for (const callback of callbacks) {
          callback(node as E, result);
        }

        if (isTS) {
          for (const scope of extractTypeNodeScopes(
            tsAs!.typeAnnotation,
            result,
          )) {
            removeScope(result.scopeManager, scope);
          }
          this.remapNodes(
            [
              {
                offset: range[0] - 1,
                range,
                newNode: node,
              },
            ],
            tokens,
            comments,
            result.visitorKeys,
          );
        }

        (node as any).parent = parent;

        tokens.shift(); // (
        tokens.pop(); // )
        tokens.pop(); // ;

        // Disconnect the tree structure.
        exprSt.expression = null as never;
      },
    );
    return callbacks;
  }

  public addObjectShorthandProperty(
    identifier: SvelteName,
    parent: SvelteNode,
    ...callbacks: ScriptLetCallback<ObjectShorthandProperty>[]
  ): void {
    const range = getNodeRange(identifier);
    const part = this.ctx.code.slice(...range);
    this.appendScript(
      `({${part}});`,
      range[0] - 2,
      this.currentScriptScopeKind,
      (st, tokens, _comments, result) => {
        const exprSt = st as ESTree.ExpressionStatement;
        const objectExpression: ESTree.ObjectExpression =
          exprSt.expression as ESTree.ObjectExpression;
        const node = objectExpression.properties[0] as ObjectShorthandProperty;
        // Process for nodes
        for (const callback of callbacks) {
          callback(node, result);
        }
        (node.key as any).parent = parent;
        (node.value as any).parent = parent;

        tokens.shift(); // (
        tokens.shift(); // {
        tokens.pop(); // }
        tokens.pop(); // )
        tokens.pop(); // ;

        // Disconnect the tree structure.
        exprSt.expression = null as never;
      },
    );
  }

  public addVariableDeclarator(
    declarator: ESTree.VariableDeclarator | ESTree.AssignmentExpression,
    parent: SvelteNode,
    ...callbacks: ScriptLetCallback<ESTree.VariableDeclarator>[]
  ): ScriptLetCallback<ESTree.VariableDeclarator>[] {
    const range =
      declarator.type === "VariableDeclarator"
        ? // As of Svelte v5-next.65, VariableDeclarator nodes do not have location information.
          [getNodeRange(declarator.id)[0], getNodeRange(declarator.init!)[1]]
        : getNodeRange(declarator);
    const part = this.ctx.code.slice(...range);
    this.appendScript(
      `const ${part};`,
      range[0] - 6,
      this.currentScriptScopeKind,
      (st, tokens, _comments, result) => {
        const decl = st as ESTree.VariableDeclaration;
        const node = decl.declarations[0];
        // Process for nodes
        for (const callback of callbacks) {
          callback(node, result);
        }

        const scope = result.getScope(decl);
        for (const variable of scope.variables) {
          for (const def of variable.defs) {
            if (def.parent === decl) {
              (def as any).parent = parent;
            }
          }
        }

        (node as any).parent = parent;

        tokens.shift(); // const
        tokens.pop(); // ;

        // Disconnect the tree structure.
        decl.declarations = [];
      },
    );
    return callbacks;
  }

  public addGenericTypeAliasDeclaration(
    param: TSESTree.TSTypeParameter,
    callbackId: (id: TSESTree.Identifier, type: TSESTree.TypeNode) => void,
    callbackDefault: (type: TSESTree.TypeNode) => void,
  ): void {
    const ranges = getTypeParameterRanges(this.ctx.code, param);
    let scriptLet = `type ${this.ctx.code.slice(...ranges.idRange)}`;
    if (ranges.constraintRange) {
      scriptLet += ` =     ${this.ctx.code.slice(...ranges.constraintRange)};`;
      //           |extends|
    } else {
      scriptLet += " = unknown;";
    }

    this.appendScript(
      scriptLet,
      ranges.idRange[0] - 5,
      "generics",
      (st, tokens, _comments, result) => {
        const decl = st as any as TSESTree.TSTypeAliasDeclaration;
        const id = decl.id;
        const typeAnnotation = decl.typeAnnotation;
        // Process for nodes
        callbackId(id, typeAnnotation);

        const scope = result.getScope(decl as any);
        for (const variable of scope.variables) {
          for (const def of variable.defs) {
            if (def.node === decl) {
              def.node = param;
            }
          }
        }

        (id as any).parent = param;
        (typeAnnotation as any).parent = param;

        tokens.shift(); // type
        if (ranges.constraintRange) {
          const eqToken = tokens[1];
          eqToken.type = "Keyword";
          eqToken.value = "extends";
          eqToken.range[0] = eqToken.range[0] - 1;
          eqToken.range[1] = eqToken.range[0] + 7;
          tokens.pop(); // ;
        } else {
          tokens.pop(); // ;
          tokens.pop(); // unknown
          tokens.pop(); // =
        }

        // Disconnect the tree structure.
        delete (decl as any).id;
        delete (decl as any).typeAnnotation;
        delete (decl as any).typeParameters;
      },
    );

    if (ranges.defaultRange) {
      const eqDefaultType = this.ctx.code.slice(
        ranges.constraintRange?.[1] ?? ranges.idRange[1],
        ranges.defaultRange[1],
      );
      const id = this.generateUniqueId(eqDefaultType);
      const scriptLet = `type ${id}${eqDefaultType};`;

      this.appendScript(
        scriptLet,
        ranges.defaultRange[0] - 5 - id.length - 1,
        "generics",
        (st, tokens, _comments, result) => {
          const decl = st as any as TSESTree.TSTypeAliasDeclaration;
          const typeAnnotation = decl.typeAnnotation;
          // Process for nodes
          callbackDefault(typeAnnotation);

          const scope = result.getScope(decl as any);
          removeIdentifierVariable(decl.id, scope);

          (typeAnnotation as any).parent = param;

          tokens.shift(); // type
          tokens.shift(); // ${id}
          tokens.pop(); // ;

          // Disconnect the tree structure.
          delete (decl as any).id;
          delete (decl as any).typeAnnotation;
          delete (decl as any).typeParameters;
        },
      );
    }
  }

  public nestIfBlock(
    expression: ESTree.Expression,
    ifBlock: SvelteIfBlock,
    callback: ScriptLetCallback<ESTree.Expression>,
  ): void {
    const range = getNodeRange(expression);
    const part = this.ctx.code.slice(...range);
    const restore = this.appendScript(
      `if(${part}){`,
      range[0] - 3,
      this.currentScriptScopeKind,
      (st, tokens, _comments, result) => {
        const ifSt = st as ESTree.IfStatement;
        const node = ifSt.test;
        const scope = result.getScope(ifSt.consequent);

        // Process for nodes
        callback(node, result);
        (node as any).parent = ifBlock;

        // Process for scope
        result.registerNodeToScope(ifBlock, scope);

        tokens.shift(); // if
        tokens.shift(); // (
        tokens.pop(); // )
        tokens.pop(); // {
        tokens.pop(); // }

        // Disconnect the tree structure.
        ifSt.test = null as never;
        ifSt.consequent = null as never;
      },
    );
    this.pushScope(restore, "}", this.currentScriptScopeKind);
  }

  public nestEachBlock(
    expression: ESTree.Expression,
    context: ESTree.Pattern,
    indexRange: { start: number; end: number } | null,
    eachBlock: SvelteEachBlock,
    callback: (
      expr: ESTree.Expression,
      ctx: ESTree.Pattern,
      index: ESTree.Identifier | null,
    ) => void,
  ): void {
    const exprRange = getNodeRange(expression);
    const ctxRange = getNodeRange(context);
    let source = "Array.from(";
    const exprOffset = source.length;
    source += `${this.ctx.code.slice(...exprRange)}).forEach((`;
    const ctxOffset = source.length;
    source += this.ctx.code.slice(...ctxRange);
    let idxOffset: number | null = null;
    if (indexRange) {
      source += ",";
      idxOffset = source.length;
      source += this.ctx.code.slice(indexRange.start, indexRange.end);
    }
    source += ")=>{";
    const restore = this.appendScript(
      source,
      exprRange[0] - exprOffset,
      this.currentScriptScopeKind,
      (st, tokens, comments, result) => {
        const expSt = st as ESTree.ExpressionStatement;
        const call = expSt.expression as ESTree.CallExpression;
        const fn = call.arguments[0] as ESTree.ArrowFunctionExpression;
        const callArrayFrom = (call.callee as ESTree.MemberExpression)
          .object as ESTree.CallExpression;
        const expr = callArrayFrom.arguments[0] as ESTree.Expression;
        const ctx = fn.params[0];
        const idx = (fn.params[1] ?? null) as ESTree.Identifier | null;
        const scope = result.getScope(fn.body);

        // Process for nodes
        callback(expr, ctx, idx);

        // Process for scope
        result.registerNodeToScope(eachBlock, scope);
        for (const v of scope.variables) {
          for (const def of v.defs) {
            if (def.node === fn) {
              def.node = eachBlock;
            }
          }
        }
        // remove Array reference
        const arrayId = (callArrayFrom.callee as ESTree.MemberExpression)
          .object;
        const ref = scope.upper!.references.find(
          (r) => r.identifier === arrayId,
        );
        if (ref) {
          removeReference(ref, scope.upper!);
        }

        (expr as any).parent = eachBlock;
        (ctx as any).parent = eachBlock;
        if (idx) {
          (idx as any).parent = eachBlock;
        }

        tokens.shift(); // Array
        tokens.shift(); // .
        tokens.shift(); // from
        tokens.shift(); // (

        tokens.pop(); // )
        tokens.pop(); // =>
        tokens.pop(); // {
        tokens.pop(); // }
        tokens.pop(); // )
        tokens.pop(); // ;

        const map = [
          {
            offset: exprOffset,
            range: exprRange,
            newNode: expr,
          },
          {
            offset: ctxOffset,
            range: ctxRange,
            newNode: ctx,
          },
        ];
        if (indexRange) {
          map.push({
            offset: idxOffset!,
            range: [indexRange.start, indexRange.end],
            newNode: idx!,
          });
        }
        this.remapNodes(map, tokens, comments, result.visitorKeys);

        // Disconnect the tree structure.
        expSt.expression = null as never;
      },
    );
    this.pushScope(restore, "});", this.currentScriptScopeKind);
  }

  public nestSnippetBlock(
    id: ESTree.Identifier,
    closeParentIndex: number,
    snippetBlock: SvelteSnippetBlock,
    kind: "snippet" | "render",
    callback: (id: ESTree.Identifier, params: ESTree.Pattern[]) => void,
  ): void {
    const idRange = getNodeRange(id);
    const part = this.ctx.code.slice(idRange[0], closeParentIndex + 1);
    const restore = this.appendScript(
      `function ${part}{`,
      idRange[0] - 9,
      kind,
      (st, tokens, _comments, result) => {
        const fnDecl = st as ESTree.FunctionDeclaration;
        const idNode = fnDecl.id;
        const params = [...fnDecl.params];
        const scope = result.getScope(fnDecl);

        // Process for nodes
        callback(idNode, params);
        (idNode as any).parent = snippetBlock;
        for (const param of params) {
          (param as any).parent = snippetBlock;
        }

        // Process for scope
        result.registerNodeToScope(snippetBlock, scope);

        tokens.shift(); // function
        tokens.pop(); // {
        tokens.pop(); // }

        // Disconnect the tree structure.
        fnDecl.id = null as never;
        fnDecl.params = [];
      },
    );
    this.pushScope(restore, "}", kind);
  }

  public nestBlock(
    block: SvelteNode,
    params?:
      | ScriptLetBlockParam[]
      | ((helper: TypeGenHelper | null) => {
          param: ScriptLetBlockParam;
          preparationScript?: string[];
        }),
  ): void {
    let resolvedParams;
    if (typeof params === "function") {
      if (this.ctx.isTypeScript()) {
        const generatedTypes = params({
          generateUniqueId: (base) => this.generateUniqueId(base),
        });
        resolvedParams = [generatedTypes.param];
        if (generatedTypes.preparationScript) {
          for (const preparationScript of generatedTypes.preparationScript) {
            this.appendScriptWithoutOffset(
              preparationScript,
              this.currentScriptScopeKind,
              (node, tokens, comments, result) => {
                tokens.length = 0;
                comments.length = 0;
                removeAllScopeAndVariableAndReference(node, result);
              },
            );
          }
        }
      } else {
        const generatedTypes = params(null);
        resolvedParams = [generatedTypes.param];
      }
    } else {
      resolvedParams = params;
    }
    if (!resolvedParams || resolvedParams.length === 0) {
      const restore = this.appendScript(
        `{`,
        block.range[0],
        this.currentScriptScopeKind,
        (st, tokens, _comments, result) => {
          const blockSt = st as ESTree.BlockStatement;

          // Process for scope
          const scope = result.getScope(blockSt);
          result.registerNodeToScope(block, scope);

          tokens.length = 0; // clear tokens

          // Disconnect the tree structure.
          blockSt.body = null as never;
        },
      );
      this.pushScope(restore, "}", this.currentScriptScopeKind);
    } else {
      const sortedParams = [...resolvedParams]
        .map((d) => {
          return {
            ...d,
            range: getNodeRange(d.node),
          };
        })
        .sort((a, b) => {
          const [pA] = a.range;
          const [pB] = b.range;
          return pA - pB;
        });

      const maps: {
        index: number;
        offset: number;
        range: readonly [number, number];
      }[] = [];

      let source = "";
      for (let index = 0; index < sortedParams.length; index++) {
        const param = sortedParams[index];
        const range = param.range;
        if (source) {
          source += ",";
        }
        const offset = source.length + 1; /* ( */
        source += this.ctx.code.slice(...range);
        maps.push({
          index: maps.length,
          offset,
          range,
        });
        if (this.ctx.isTypeScript()) {
          source += `: (${param.typing})`;
        }
      }
      const restore = this.appendScript(
        `(${source})=>{`,
        maps[0].range[0] - 1,
        this.currentScriptScopeKind,
        (st, tokens, comments, result) => {
          const exprSt = st as ESTree.ExpressionStatement;
          const fn = exprSt.expression as ESTree.ArrowFunctionExpression;
          const scope = result.getScope(fn.body);

          // Process for nodes
          for (let index = 0; index < fn.params.length; index++) {
            const p = fn.params[index];
            sortedParams[index].callback(p, result);
            if (this.ctx.isTypeScript()) {
              const typeAnnotation = (p as any).typeAnnotation;
              delete (p as any).typeAnnotation;

              p.range![1] = typeAnnotation.range[0];
              p.loc!.end = {
                line: typeAnnotation.loc.start.line,
                column: typeAnnotation.loc.start.column,
              };

              removeAllScopeAndVariableAndReference(typeAnnotation, result);
            }
            (p as any).parent = sortedParams[index].parent;
          }

          // Process for scope
          result.registerNodeToScope(block, scope);
          for (const v of scope.variables) {
            for (const def of v.defs) {
              if (def.node === fn) {
                def.node = block;
              }
            }
          }

          tokens.shift(); // (
          tokens.pop(); // )
          tokens.pop(); // =>
          tokens.pop(); // {
          tokens.pop(); // }
          tokens.pop(); // ;

          this.remapNodes(
            maps.map((m) => {
              return {
                offset: m.offset,
                range: m.range,
                newNode: fn.params[m.index],
              };
            }),
            tokens,
            comments,
            result.visitorKeys,
          );

          // Disconnect the tree structure.
          exprSt.expression = null as never;
        },
      );
      this.pushScope(restore, "};", this.currentScriptScopeKind);
    }
  }

  public closeScope(): void {
    this.closeScopeCallbacks.pop()!();
  }

  public addProgramRestore(callback: ScriptLetRestoreCallback): void {
    this.programRestoreCallbacks.push(callback);
  }

  private appendScript(
    text: string,
    offset: number,
    kind: "generics" | "snippet" | "render",
    callback: (
      node: ESTree.Node,
      tokens: Token[],
      comments: Comment[],
      options: ScriptLetCallbackOption,
    ) => void,
  ) {
    const resultCallback = this.appendScriptWithoutOffset(
      text,
      kind,
      (node, tokens, comments, result) => {
        fixLocations(
          node,
          tokens,
          comments,
          offset - resultCallback.start,
          result.visitorKeys,
          this.ctx,
        );
        callback(node, tokens, comments, result);
      },
    );
    return resultCallback;
  }

  private appendScriptWithoutOffset(
    text: string,
    kind: "generics" | "snippet" | "render",
    callback: (
      node: ESTree.Node,
      tokens: Token[],
      comments: Comment[],
      options: ScriptLetCallbackOption,
    ) => void,
  ) {
    const { start: startOffset, end: endOffset } = this.script.addLet(
      text,
      kind,
    );

    const restoreCallback: RestoreCallback = {
      start: startOffset,
      end: endOffset,
      callback,
    };
    this.restoreCallbacks.push(restoreCallback);
    return restoreCallback;
  }

  private pushScope(
    restoreCallback: RestoreCallback,
    closeToken: string,
    kind: "snippet" | "render",
  ) {
    const upper = this.currentScriptScopeKind;
    this.currentScriptScopeKind = kind;
    this.closeScopeCallbacks.push(() => {
      this.script.addLet(closeToken, kind);
      this.currentScriptScopeKind = upper;
      restoreCallback.end = this.script.getCurrentVirtualCodeLength();
    });
  }

  /**
   * Restore AST nodes
   */
  public restore(result: ESLintExtendedProgram): void {
    const nodeToScope = getNodeToScope(result.scopeManager!);
    const postprocessList: (() => void)[] = [];

    const callbackOption: ScriptLetRestoreCallbackOption = {
      getScope,
      registerNodeToScope,
      scopeManager: result.scopeManager!,
      visitorKeys: result.visitorKeys,
      addPostProcess: (cb) => postprocessList.push(cb),
    };

    this.restoreNodes(result, callbackOption);
    this.restoreProgram(result, callbackOption);
    postprocessList.forEach((p) => p());

    // Helpers
    /** Get scope */
    function getScope(node: ESTree.Node) {
      return getScopeFromNode(result.scopeManager!, node);
    }

    /** Register node to scope */
    function registerNodeToScope(node: any, scope: Scope): void {
      // If we replace the `scope.block` at this time,
      // the scope restore calculation will not work, so we will replace the `scope.block` later.
      postprocessList.push(() => {
        const beforeBlock = scope.block;
        scope.block = node;

        for (const variable of [
          ...scope.variables,
          ...(scope.upper?.variables ?? []),
        ]) {
          for (const def of variable.defs) {
            if (def.node === beforeBlock) {
              def.node = node;
            }
          }
        }
      });

      const scopes = nodeToScope.get(node);
      if (scopes) {
        scopes.push(scope);
      } else {
        nodeToScope.set(node, [scope]);
      }
    }
  }

  /**
   * Restore AST nodes
   */
  private restoreNodes(
    result: ESLintExtendedProgram,
    callbackOption: ScriptLetRestoreCallbackOption,
  ): void {
    let orderedRestoreCallback = this.restoreCallbacks.shift();
    if (!orderedRestoreCallback) {
      return;
    }
    const separateIndexes = this.script.separateIndexes;
    const tokens = result.ast.tokens;
    const processedTokens = [];
    const comments = result.ast.comments;
    const processedComments = [];

    let tok;
    while ((tok = tokens.shift())) {
      if (separateIndexes.includes(tok.range[0]) && tok.value === ";") {
        break;
      }
      if (orderedRestoreCallback.start <= tok.range[0]) {
        tokens.unshift(tok);
        break;
      }
      processedTokens.push(tok);
    }
    while ((tok = comments.shift())) {
      if (orderedRestoreCallback.start <= tok.range[0]) {
        comments.unshift(tok);
        break;
      }
      processedComments.push(tok);
    }

    const targetNodes = new Map<ESTree.Node, RestoreCallback>();
    const removeStatements: ESTree.Statement[] = [];

    traverseNodes(result.ast, {
      visitorKeys: result.visitorKeys,
      enterNode: (node) => {
        while (node.range && separateIndexes.includes(node.range[1] - 1)) {
          node.range[1]--;
          node.loc!.end.column--;
        }
        if (node.loc!.end.column < 0) {
          node.loc!.end = this.ctx.getLocFromIndex(node.range![1]);
        }
        if (
          (node as any).parent === result.ast &&
          separateIndexes[0] <= node.range![0]
        ) {
          removeStatements.push(node as any);
        }
        if (!orderedRestoreCallback) {
          return;
        }
        if (
          orderedRestoreCallback.start <= node.range![0] &&
          node.range![1] <= orderedRestoreCallback.end
        ) {
          targetNodes.set(node, orderedRestoreCallback);
          orderedRestoreCallback = this.restoreCallbacks.shift();
        }
        //
      },
      leaveNode(node) {
        const restoreCallback = targetNodes.get(node);
        if (!restoreCallback) {
          return;
        }
        const startIndex = {
          token: tokens.findIndex((t) => restoreCallback.start <= t.range[0]),
          comment: comments.findIndex(
            (t) => restoreCallback.start <= t.range[0],
          ),
        };
        if (startIndex.comment === -1) {
          startIndex.comment = comments.length;
        }
        const endIndex = {
          token: tokens.findIndex(
            (t) => restoreCallback.end < t.range[1],
            startIndex.token,
          ),
          comment: comments.findIndex(
            (t) => restoreCallback.end < t.range[1],
            startIndex.comment,
          ),
        };
        if (endIndex.token === -1) {
          endIndex.token = tokens.length;
        }
        if (endIndex.comment === -1) {
          endIndex.comment = comments.length;
        }
        const targetTokens = tokens.splice(
          startIndex.token,
          endIndex.token - startIndex.token,
        );
        const targetComments = comments.splice(
          startIndex.comment,
          endIndex.comment - startIndex.comment,
        );
        restoreCallback.callback(
          node,
          targetTokens,
          targetComments,
          callbackOption,
        );

        processedTokens.push(...targetTokens);
        processedComments.push(...targetComments);
      },
    });
    for (const st of removeStatements) {
      const index = result.ast.body.indexOf(st);
      result.ast.body.splice(index, 1);
    }

    result.ast.tokens = processedTokens;
    result.ast.comments = processedComments;
  }

  /**
   * Restore program node
   */
  private restoreProgram(
    result: ESLintExtendedProgram,
    callbackOption: ScriptLetRestoreCallbackOption,
  ): void {
    for (const callback of this.programRestoreCallbacks) {
      callback(
        result.ast,
        result.ast.tokens,
        result.ast.comments,
        callbackOption,
      );
    }
  }

  private remapNodes(
    maps: {
      offset: number;
      range: readonly [number, number];
      newNode: ESTree.Node;
    }[],
    tokens: Token[],
    comments: Comment[],
    visitorKeys?: { [type: string]: string[] },
  ) {
    const targetMaps = [...maps];
    const first = targetMaps.shift()!;
    let tokenIndex = 0;
    for (; tokenIndex < tokens.length; tokenIndex++) {
      const token = tokens[tokenIndex];
      if (first.range[1] <= token.range[0]) {
        break;
      }
    }

    for (const map of targetMaps) {
      const startOffset = map.offset - first.offset + first.range[0];
      const endOffset = startOffset + (map.range[1] - map.range[0]);

      let removeCount = 0;
      let target = tokens[tokenIndex];
      while (target && target.range[1] <= startOffset) {
        removeCount++;
        target = tokens[tokenIndex + removeCount];
      }
      if (removeCount) {
        tokens.splice(tokenIndex, removeCount);
      }

      const bufferTokens: Token[] = [];
      for (; tokenIndex < tokens.length; tokenIndex++) {
        const token = tokens[tokenIndex];
        if (endOffset <= token.range[0]) {
          break;
        }
        bufferTokens.push(token);
      }
      fixLocations(
        map.newNode,
        bufferTokens,
        comments.filter(
          (t) => startOffset <= t.range[0] && t.range[1] <= endOffset,
        ),
        map.range[0] - startOffset,
        visitorKeys,
        this.ctx,
      );
    }
    tokens.splice(tokenIndex);
  }

  private generateUniqueId(base: string) {
    return this.unique.generate(
      base,
      this.ctx.code,
      this.script.getCurrentVirtualCode(),
    );
  }
}

function getTypeParameterRanges(code: string, param: TSESTree.TSTypeParameter) {
  const idRange: [number, number] = [
    param.range[0],
    param.constraint || param.default ? param.name.range[1] : param.range[1],
  ];
  let constraintRange: [number, number] | null = null;
  let defaultRange: [number, number] | null = null;
  if (param.constraint) {
    constraintRange = [
      param.constraint.range[0],
      param.default ? param.constraint.range[1] : param.range[1],
    ];
    const index = getTokenIndex(
      code,
      (code, index) => code.startsWith("extends", index),
      idRange[1],
      param.constraint.range[0],
    );
    if (index != null) {
      idRange[1] = index;
      constraintRange[0] = index + 7;
    }
  }
  if (param.default) {
    defaultRange = [param.default.range[0], param.range[1]];
    const index = getTokenIndex(
      code,
      (code, index) => code[index] === "=",
      constraintRange?.[1] ?? idRange[1],
      param.default.range[0],
    );
    if (index != null) {
      (constraintRange ?? idRange)[1] = index;
      defaultRange[0] = index + 1;
    }
  }
  return { idRange, constraintRange, defaultRange };
}

function getTokenIndex(
  code: string,
  targetToken: (code: string, index: number) => boolean,
  start: number,
  end: number,
) {
  let index = start;
  while (index < end) {
    if (targetToken(code, index)) {
      return index;
    }
    if (code.startsWith("//", index)) {
      const lfIndex = code.indexOf("\n", index);
      if (lfIndex >= 0) {
        index = lfIndex + 1;
        continue;
      }
      return null;
    }
    if (code.startsWith("/*", index)) {
      const endIndex = code.indexOf("*/", index);
      if (endIndex >= 0) {
        index = endIndex + 2;
        continue;
      }
      return null;
    }
    index++;
  }
  return null;
}

/** Get the node to scope map from given scope manager  */
function getNodeToScope(
  scopeManager: ScopeManager,
): WeakMap<ESTree.Node, Scope[]> {
  if ("__nodeToScope" in scopeManager) {
    return (scopeManager as any).__nodeToScope;
  }

  // transform scopeManager
  const nodeToScope = new WeakMap<ESTree.Node, Scope[]>();
  for (const scope of scopeManager.scopes) {
    const scopes = nodeToScope.get(scope.block);
    if (scopes) {
      scopes.push(scope);
    } else {
      nodeToScope.set(scope.block, [scope]);
    }
  }
  scopeManager.acquire = function (node, inner) {
    /**
     * predicate
     */
    function predicate(testScope: Scope) {
      if (testScope.type === "function" && testScope.functionExpressionScope) {
        return false;
      }
      return true;
    }

    const scopes = nodeToScope.get(node as any);

    if (!scopes || scopes.length === 0) {
      return null;
    }

    // Heuristic selection from all scopes.
    // If you would like to get all scopes, please use ScopeManager#acquireAll.
    if (scopes.length === 1) {
      return scopes[0];
    }

    if (inner) {
      for (let i = scopes.length - 1; i >= 0; --i) {
        const scope = scopes[i];

        if (predicate(scope)) {
          return scope;
        }
      }
    } else {
      for (let i = 0, iz = scopes.length; i < iz; ++i) {
        const scope = scopes[i];

        if (predicate(scope)) {
          return scope;
        }
      }
    }

    return null;
  };

  return nodeToScope;
}

/** Extract the type scope of the given node. */
function extractTypeNodeScopes(
  node: TSESTree.TypeNode | TSParenthesizedType,
  result: ScriptLetCallbackOption,
): Iterable<Scope> {
  const scopes = new Set<Scope>();
  for (const scope of iterateTypeNodeScopes(node)) {
    scopes.add(scope);
  }

  return scopes;

  /** Iterate the type scope of the given node. */
  function* iterateTypeNodeScopes(
    node: TSESTree.TypeNode | TSParenthesizedType,
  ): Iterable<Scope> {
    if (node.type === "TSParenthesizedType") {
      // Skip TSParenthesizedType.
      yield* iterateTypeNodeScopes(node.typeAnnotation);
    } else if (node.type === "TSConditionalType") {
      yield result.getScope(node as any);
      // `falseType` of `TSConditionalType` is sibling scope.
      const falseType: TSESTree.TypeNode = node.falseType;
      yield* iterateTypeNodeScopes(falseType);
    } else if (
      node.type === "TSFunctionType" ||
      node.type === "TSMappedType" ||
      node.type === "TSConstructorType"
    ) {
      yield result.getScope(node as any);
    } else {
      const typeNode: Exclude<TSESTree.TypeNode, TSScope["block"]> = node;
      for (const key of getKeys(typeNode, result.visitorKeys)) {
        for (const child of getNodes(typeNode, key)) {
          yield* iterateTypeNodeScopes(child as TSESTree.TypeNode);
        }
      }
    }
  }
}
