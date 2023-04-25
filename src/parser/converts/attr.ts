import type {
  SvelteActionDirective,
  SvelteAnimationDirective,
  SvelteAttribute,
  SvelteShorthandAttribute,
  SvelteBindingDirective,
  SvelteClassDirective,
  SvelteDirective,
  SvelteEventHandlerDirective,
  SvelteLetDirective,
  SvelteSpreadAttribute,
  SvelteTransitionDirective,
  SvelteStartTag,
  SvelteName,
  SvelteStyleDirective,
  SvelteStyleDirectiveLongform,
  SvelteStyleDirectiveShorthand,
  SvelteElement,
  SvelteScriptElement,
  SvelteStyleElement,
} from "../../ast";
import type ESTree from "estree";
import type { Context } from "../../context";
import type * as SvAST from "../svelte-ast-types";
import { getWithLoc, indexOf } from "./common";
import { convertMustacheTag } from "./mustache";
import {
  convertAttributeValueTokenToLiteral,
  convertTextToLiteral,
} from "./text";
import { ParseError } from "../../errors";
import type { ScriptLetCallback } from "../../context/script-let";
import type { AttributeToken } from "../html";

/** Convert for Attributes */
export function* convertAttributes(
  attributes: SvAST.AttributeOrDirective[],
  parent: SvelteStartTag,
  elementName: string,
  ctx: Context
): IterableIterator<
  | SvelteAttribute
  | SvelteShorthandAttribute
  | SvelteSpreadAttribute
  | SvelteDirective
  | SvelteStyleDirective
> {
  for (const attr of attributes) {
    if (attr.type === "Attribute") {
      yield convertAttribute(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Spread") {
      yield convertSpreadAttribute(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Binding") {
      yield convertBindingDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "EventHandler") {
      yield convertEventHandlerDirective(attr, parent, elementName, ctx);
      continue;
    }
    if (attr.type === "Class") {
      yield convertClassDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "StyleDirective") {
      yield convertStyleDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Transition") {
      yield convertTransitionDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Animation") {
      yield convertAnimationDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Action") {
      yield convertActionDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Let") {
      yield convertLetDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Ref") {
      throw new ParseError("Ref are not supported.", attr.start, ctx);
    }
    if ((attr as any).type === "Style") {
      throw new ParseError(
        `Svelte v3.46.0 is no longer supported. Please use Svelte>=v3.46.1.`,
        attr.start,
        ctx
      );
    }
    throw new ParseError(
      `Unknown directive or attribute (${attr.type}) are not supported.`,
      attr.start,
      ctx
    );
  }
}

/** Convert for attribute tokens */
export function* convertAttributeTokens(
  attributes: AttributeToken[],
  parent: SvelteStartTag,
  ctx: Context
): IterableIterator<SvelteAttribute> {
  for (const attr of attributes) {
    const attribute: SvelteAttribute = {
      type: "SvelteAttribute",
      boolean: false,
      key: null as any,
      value: [],
      parent,
      ...ctx.getConvertLocation({
        start: attr.key.start,
        end: attr.value?.end ?? attr.key.end,
      }),
    };
    attribute.key = {
      type: "SvelteName",
      name: attr.key.name,
      parent: attribute,
      ...ctx.getConvertLocation(attr.key),
    };
    ctx.addToken("HTMLIdentifier", attr.key);
    if (attr.value == null) {
      attribute.boolean = true;
    } else {
      attribute.value.push(
        convertAttributeValueTokenToLiteral(attr.value, attribute, ctx)
      );
    }
    yield attribute;
  }
}

/** Convert for Attribute */
function convertAttribute(
  node: SvAST.Attribute,
  parent: SvelteAttribute["parent"],
  ctx: Context
): SvelteAttribute | SvelteShorthandAttribute {
  const attribute: SvelteAttribute = {
    type: "SvelteAttribute",
    boolean: false,
    key: null as any,
    value: [],
    parent,
    ...ctx.getConvertLocation(node),
  };
  const keyStart = ctx.code.indexOf(node.name, node.start);
  const keyRange = { start: keyStart, end: keyStart + node.name.length };
  attribute.key = {
    type: "SvelteName",
    name: node.name,
    parent: attribute,
    ...ctx.getConvertLocation(keyRange),
  };

  if (node.value === true) {
    // Boolean attribute
    attribute.boolean = true;
    ctx.addToken("HTMLIdentifier", keyRange);
    return attribute;
  }
  const shorthand = node.value.find((v) => v.type === "AttributeShorthand");
  if (shorthand) {
    const key: ESTree.Identifier = {
      ...attribute.key,
      type: "Identifier",
    };
    const sAttr: SvelteShorthandAttribute = {
      type: "SvelteShorthandAttribute",
      key,
      value: key,
      parent,
      loc: attribute.loc,
      range: attribute.range,
    };
    (key as any).parent = sAttr;
    ctx.scriptLet.addObjectShorthandProperty(attribute.key, sAttr, (es) => {
      if (
        // FIXME: Older parsers may use the same node. In that case, do not replace.
        // We will drop support for ESLint v7 in the next major version and remove this branch.
        es.key !== es.value
      ) {
        sAttr.key = es.key;
      }
      sAttr.value = es.value;
    });
    return sAttr;
  }
  processAttributeValue(
    node.value as (SvAST.Text | SvAST.MustacheTag)[],
    attribute,
    ctx
  );

  // Not required for shorthands. Therefore, register the token here.
  ctx.addToken("HTMLIdentifier", keyRange);

  return attribute;
}

/** Common process attribute value */
function processAttributeValue(
  nodeValue: (SvAST.Text | SvAST.MustacheTag)[],
  attribute: SvelteAttribute | SvelteStyleDirectiveLongform,
  ctx: Context
) {
  for (let index = 0; index < nodeValue.length; index++) {
    const v = nodeValue[index];
    if (v.type === "Text") {
      if (v.start === v.end) {
        // Empty
        // https://github.com/sveltejs/svelte/pull/6539
        continue;
      }
      const next = nodeValue[index + 1];
      if (next && next.start < v.end) {
        // Maybe bug in Svelte can cause the completion index to shift.
        // console.log(ctx.getText(v), v.data)
        v.end = next.start;
      }
      attribute.value.push(convertTextToLiteral(v, attribute, ctx));
      continue;
    }
    if (v.type === "MustacheTag") {
      const mustache = convertMustacheTag(v, attribute, ctx);
      attribute.value.push(mustache);
      continue;
    }
    const u: any = v;
    throw new ParseError(
      `Unknown attribute value (${u.type}) are not supported.`,
      u.start,
      ctx
    );
  }
}

/** Convert for Spread */
function convertSpreadAttribute(
  node: SvAST.Spread,
  parent: SvelteSpreadAttribute["parent"],
  ctx: Context
): SvelteSpreadAttribute {
  const attribute: SvelteSpreadAttribute = {
    type: "SvelteSpreadAttribute",
    argument: null as any,
    parent,
    ...ctx.getConvertLocation(node),
  };

  const spreadStart = ctx.code.indexOf("...", node.start);
  ctx.addToken("Punctuator", {
    start: spreadStart,
    end: spreadStart + 3,
  });

  ctx.scriptLet.addExpression(node.expression, attribute, null, (es) => {
    attribute.argument = es;
  });

  return attribute;
}

/** Convert for Binding Directive */
function convertBindingDirective(
  node: SvAST.DirectiveForExpression,
  parent: SvelteDirective["parent"],
  ctx: Context
): SvelteBindingDirective {
  const directive: SvelteBindingDirective = {
    type: "SvelteDirective",
    kind: "Binding",
    key: null as any,
    shorthand: false,
    expression: null,
    parent,
    ...ctx.getConvertLocation(node),
  };
  processDirective(node, directive, ctx, {
    processExpression(expression, shorthand) {
      directive.shorthand = shorthand;
      return ctx.scriptLet.addExpression(
        expression,
        directive,
        null,
        (es, { getInnermostScope }) => {
          directive.expression = es;
          const scope = getInnermostScope(es);
          const reference = scope.references.find(
            (ref) => ref.identifier === es
          );
          if (reference) {
            // The bind directive does read and write.
            reference.isWrite = () => true;
            reference.isWriteOnly = () => false;
            reference.isReadWrite = () => true;
            reference.isReadOnly = () => false;
            reference.isRead = () => true;
          }
        }
      );
    },
  });
  return directive;
}

/** Convert for EventHandler Directive */
function convertEventHandlerDirective(
  node: SvAST.DirectiveForExpression,
  parent: SvelteDirective["parent"],
  elementName: string,
  ctx: Context
): SvelteEventHandlerDirective {
  const directive: SvelteEventHandlerDirective = {
    type: "SvelteDirective",
    kind: "EventHandler",
    key: null as any,
    expression: null,
    parent,
    ...ctx.getConvertLocation(node),
  };
  const typing = buildEventHandlerType(parent.parent, elementName, node.name);
  processDirective(node, directive, ctx, {
    processExpression: buildProcessExpressionForExpression(
      directive,
      ctx,
      typing
    ),
  });
  return directive;
}

/** Build event handler type */
function buildEventHandlerType(
  element: SvelteElement | SvelteScriptElement | SvelteStyleElement,
  elementName: string,
  eventName: string
) {
  const nativeEventHandlerType = [
    `(e:`,
    /**/ `'${eventName}' extends infer EVT`,
    /**/ /**/ `?EVT extends keyof HTMLElementEventMap`,
    /**/ /**/ /**/ `?HTMLElementEventMap[EVT]`,
    /**/ /**/ /**/ `:CustomEvent<any>`,
    /**/ /**/ `:never`,
    `)=>void`,
  ].join("");
  if (element.type !== "SvelteElement") {
    return nativeEventHandlerType;
  }
  if (element.kind === "component") {
    // `@typescript-eslint/parser` currently cannot parse `*.svelte` import types correctly.
    // So if we try to do a correct type parsing, it's argument type will be `any`.
    // A workaround is to inject the type directly, as `CustomEvent<any>` is better than `any`.

    // const componentEvents = `import('svelte').ComponentEvents<${elementName}>`;
    // return `(e:'${eventName}' extends keyof ${componentEvents}?${componentEvents}['${eventName}']:CustomEvent<any>)=>void`;

    return `(e:CustomEvent<any>)=>void`;
  }
  if (element.kind === "special") {
    if (elementName === "svelte:component") return `(e:CustomEvent<any>)=>void`;
    return nativeEventHandlerType;
  }
  const attrName = `on:${eventName}`;
  const importSvelteHTMLElements =
    "import('svelte/elements').SvelteHTMLElements";
  return [
    `'${elementName}' extends infer EL`,
    /**/ `?(`,
    /**/ /**/ `EL extends keyof ${importSvelteHTMLElements}`,
    /**/ /**/ `?(`,
    /**/ /**/ /**/ `'${attrName}' extends infer ATTR`,
    /**/ /**/ /**/ `?(`,
    /**/ /**/ /**/ /**/ `ATTR extends keyof ${importSvelteHTMLElements}[EL]`,
    /**/ /**/ /**/ /**/ /**/ `?${importSvelteHTMLElements}[EL][ATTR]`,
    /**/ /**/ /**/ /**/ /**/ `:${nativeEventHandlerType}`,
    /**/ /**/ /**/ `)`,
    /**/ /**/ /**/ `:never`,
    /**/ /**/ `)`,
    /**/ /**/ `:${nativeEventHandlerType}`,
    /**/ `)`,
    /**/ `:never`,
  ].join("");
}

/** Convert for Class Directive */
function convertClassDirective(
  node: SvAST.DirectiveForExpression,
  parent: SvelteDirective["parent"],
  ctx: Context
): SvelteClassDirective {
  const directive: SvelteClassDirective = {
    type: "SvelteDirective",
    kind: "Class",
    key: null as any,
    shorthand: false,
    expression: null,
    parent,
    ...ctx.getConvertLocation(node),
  };
  processDirective(node, directive, ctx, {
    processExpression(expression, shorthand) {
      directive.shorthand = shorthand;
      return ctx.scriptLet.addExpression(expression, directive);
    },
  });
  return directive;
}

/** Convert for Style Directive */
function convertStyleDirective(
  node: SvAST.StyleDirective,
  parent: SvelteStyleDirective["parent"],
  ctx: Context
): SvelteStyleDirective {
  const directive: SvelteStyleDirectiveLongform = {
    type: "SvelteStyleDirective",
    key: null as any,
    shorthand: false,
    value: [],
    parent,
    ...ctx.getConvertLocation(node),
  };
  processDirectiveKey(node, directive, ctx);

  const keyName = directive.key.name;
  if (node.value === true) {
    const shorthandDirective =
      directive as unknown as SvelteStyleDirectiveShorthand;
    shorthandDirective.shorthand = true;
    ctx.scriptLet.addExpression(
      keyName,
      shorthandDirective.key,
      null,
      (expression) => {
        if (expression.type !== "Identifier") {
          throw new ParseError(
            `Expected JS identifier or attribute value.`,
            expression.range![0],
            ctx
          );
        }
        shorthandDirective.key.name = expression;
      }
    );
    return shorthandDirective;
  }
  ctx.addToken("HTMLIdentifier", {
    start: keyName.range[0],
    end: keyName.range[1],
  });

  processAttributeValue(node.value, directive, ctx);

  return directive;
}

/** Convert for Transition Directive */
function convertTransitionDirective(
  node: SvAST.TransitionDirective,
  parent: SvelteDirective["parent"],
  ctx: Context
): SvelteTransitionDirective {
  const directive: SvelteTransitionDirective = {
    type: "SvelteDirective",
    kind: "Transition",
    intro: node.intro,
    outro: node.outro,
    key: null as any,
    expression: null,
    parent,
    ...ctx.getConvertLocation(node),
  };
  processDirective(node, directive, ctx, {
    processExpression: buildProcessExpressionForExpression(
      directive,
      ctx,
      null
    ),
    processName: (name) =>
      ctx.scriptLet.addExpression(
        name,
        directive.key,
        null,
        buildExpressionTypeChecker(["Identifier"], ctx)
      ),
  });
  return directive;
}

/** Convert for Animation Directive */
function convertAnimationDirective(
  node: SvAST.DirectiveForExpression,
  parent: SvelteDirective["parent"],
  ctx: Context
): SvelteAnimationDirective {
  const directive: SvelteAnimationDirective = {
    type: "SvelteDirective",
    kind: "Animation",
    key: null as any,
    expression: null,
    parent,
    ...ctx.getConvertLocation(node),
  };
  processDirective(node, directive, ctx, {
    processExpression: buildProcessExpressionForExpression(
      directive,
      ctx,
      null
    ),
    processName: (name) =>
      ctx.scriptLet.addExpression(
        name,
        directive.key,
        null,
        buildExpressionTypeChecker(["Identifier"], ctx)
      ),
  });
  return directive;
}

/** Convert for Action Directive */
function convertActionDirective(
  node: SvAST.DirectiveForExpression,
  parent: SvelteDirective["parent"],
  ctx: Context
): SvelteActionDirective {
  const directive: SvelteActionDirective = {
    type: "SvelteDirective",
    kind: "Action",
    key: null as any,
    expression: null,
    parent,
    ...ctx.getConvertLocation(node),
  };
  processDirective(node, directive, ctx, {
    processExpression: buildProcessExpressionForExpression(
      directive,
      ctx,
      `Parameters<typeof ${node.name}>[1]`
    ),
    processName: (name) =>
      ctx.scriptLet.addExpression(
        name,
        directive.key,
        null,
        buildExpressionTypeChecker(["Identifier", "MemberExpression"], ctx)
      ),
  });
  return directive;
}

/** Convert for Let Directive */
function convertLetDirective(
  node: SvAST.LetDirective,
  parent: SvelteLetDirective["parent"],
  ctx: Context
): SvelteLetDirective {
  const directive: SvelteLetDirective = {
    type: "SvelteDirective",
    kind: "Let",
    key: null as any,
    expression: null,
    parent,
    ...ctx.getConvertLocation(node),
  };
  processDirective(node, directive, ctx, {
    processPattern(pattern) {
      return ctx.letDirCollections
        .getCollection()
        .addPattern(pattern, directive, "any");
    },
    processName: node.expression
      ? undefined
      : (name) => {
          // shorthand
          ctx.letDirCollections
            .getCollection()
            .addPattern(name, directive, "any", (es) => {
              directive.expression = es;
            });
          return [];
        },
  });
  return directive;
}

type DirectiveProcessors<
  D extends SvAST.Directive,
  S extends SvelteDirective,
  E extends D["expression"] & S["expression"]
> =
  | {
      processExpression: (
        expression: E,
        shorthand: boolean
      ) => ScriptLetCallback<NonNullable<E>>[];
      processPattern?: undefined;
      processName?: (
        expression: SvelteName
      ) => ScriptLetCallback<Exclude<S["key"]["name"], SvelteName>>[];
    }
  | {
      processExpression?: undefined;
      processPattern: (
        expression: E,
        shorthand: boolean
      ) => ScriptLetCallback<NonNullable<E>>[];
      processName?: (
        expression: SvelteName
      ) => ScriptLetCallback<Exclude<S["key"]["name"], SvelteName>>[];
    };

/** Common process for directive */
function processDirective<
  D extends SvAST.Directive,
  S extends SvelteDirective,
  E extends D["expression"] & S["expression"]
>(
  node: D & { expression: null | E },
  directive: S,
  ctx: Context,
  processors: DirectiveProcessors<D, S, E>
) {
  processDirectiveKey(node, directive, ctx);
  processDirectiveExpression<D, S, E>(node, directive, ctx, processors);
}

/** Common process for directive key */
function processDirectiveKey<
  D extends SvAST.Directive | SvAST.StyleDirective,
  S extends SvelteDirective | SvelteStyleDirective
>(node: D, directive: S, ctx: Context) {
  const colonIndex = ctx.code.indexOf(":", directive.range[0]);
  ctx.addToken("HTMLIdentifier", {
    start: directive.range[0],
    end: colonIndex,
  });
  const nameIndex = ctx.code.indexOf(node.name, colonIndex + 1);
  const nameRange = {
    start: nameIndex,
    end: nameIndex + node.name.length,
  };

  let keyEndIndex = nameRange.end;

  // modifiers
  if (ctx.code[nameRange.end] === "|") {
    let nextStart = nameRange.end + 1;
    let nextEnd = indexOf(
      ctx.code,
      (c) => c === "=" || c === ">" || c === "/" || c === "|" || !c.trim(),
      nextStart
    );
    ctx.addToken("HTMLIdentifier", { start: nextStart, end: nextEnd });
    while (ctx.code[nextEnd] === "|") {
      nextStart = nextEnd + 1;
      nextEnd = indexOf(
        ctx.code,
        (c) => c === "=" || c === ">" || c === "/" || c === "|" || !c.trim(),
        nextStart
      );
      ctx.addToken("HTMLIdentifier", { start: nextStart, end: nextEnd });
    }
    keyEndIndex = nextEnd;
  }

  const key = (directive.key = {
    type: "SvelteDirectiveKey",
    name: null as any,
    modifiers: node.modifiers,
    parent: directive,
    ...ctx.getConvertLocation({ start: node.start, end: keyEndIndex }),
  });

  // put name
  key.name = {
    type: "SvelteName",
    name: node.name,
    parent: key,
    ...ctx.getConvertLocation(nameRange),
  };
}

/** Common process for directive expression */
function processDirectiveExpression<
  D extends SvAST.Directive,
  S extends SvelteDirective,
  E extends D["expression"]
>(
  node: D & { expression: null | E },
  directive: S,
  ctx: Context,
  processors: DirectiveProcessors<D, S, E>
) {
  const key = directive.key;
  const keyName = key.name as SvelteName;
  let shorthand = false;

  if (node.expression) {
    shorthand =
      node.expression.type === "Identifier" &&
      node.expression.name === node.name &&
      getWithLoc(node.expression).start === keyName.range[0];
    if (shorthand && getWithLoc(node.expression).end !== keyName.range[1]) {
      // The identifier location may be incorrect in some edge cases.
      // e.g. bind:value=""
      getWithLoc(node.expression).end = keyName.range[1];
    }
    if (processors.processExpression) {
      processors.processExpression(node.expression, shorthand).push((es) => {
        if (node.expression && es.type !== node.expression.type) {
          throw new ParseError(
            `Expected ${node.expression.type}, but ${es.type} found.`,
            es.range![0],
            ctx
          );
        }
        directive.expression = es;
      });
    } else {
      processors.processPattern(node.expression, shorthand).push((es) => {
        directive.expression = es;
      });
    }
  }
  if (!shorthand) {
    if (processors.processName) {
      processors.processName(keyName).push((es) => {
        key.name = es;
      });
    } else {
      ctx.addToken("HTMLIdentifier", {
        start: keyName.range[0],
        end: keyName.range[1],
      });
    }
  }
}

/** Build processExpression for Expression */
function buildProcessExpressionForExpression(
  directive: SvelteDirective & { expression: null | ESTree.Expression },
  ctx: Context,
  typing: string | null
): (expression: ESTree.Expression) => ScriptLetCallback<ESTree.Expression>[] {
  return (expression) => {
    return ctx.scriptLet.addExpression(expression, directive, typing);
  };
}

/** Build expression type checker to script let callbacks */
function buildExpressionTypeChecker<T extends ESTree.Expression>(
  expected: T["type"][],
  ctx: Context
): ScriptLetCallback<T> {
  return (node) => {
    if (!expected.includes(node.type)) {
      throw new ParseError(
        `Expected JS ${expected.join(", or ")}, but ${node.type} found.`,
        node.range![0],
        ctx
      );
    }
  };
}
