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
  SvelteElseBlock,
  SvelteAwaitBlock,
} from "../../ast";
import type ESTree from "estree";
import type { Context } from "../../context";
import type * as SvAST from "../svelte-ast-types";
import type * as Compiler from "svelte/compiler";
import { getWithLoc, indexOf } from "./common";
import { convertMustacheTag } from "./mustache";
import {
  convertAttributeValueTokenToLiteral,
  convertTextToLiteral,
} from "./text";
import { ParseError } from "../../errors";
import type { ScriptLetCallback } from "../../context/script-let";
import type { AttributeToken } from "../html";
import { svelteVersion } from "../svelte-version";
import { hasTypeInfo } from "../../utils";
import { getModifiers } from "../compat";

/** Convert for Attributes */
export function* convertAttributes(
  attributes: (
    | SvAST.AttributeOrDirective
    | Compiler.Attribute
    | Compiler.SpreadAttribute
    | Compiler.Directive
  )[],
  parent: SvelteStartTag,
  ctx: Context,
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
    if (attr.type === "SpreadAttribute") {
      yield convertSpreadAttribute(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Spread") {
      yield convertSpreadAttribute(attr, parent, ctx);
      continue;
    }
    if (attr.type === "BindDirective") {
      yield convertBindingDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Binding") {
      yield convertBindingDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "OnDirective") {
      yield convertEventHandlerDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "EventHandler") {
      yield convertEventHandlerDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "ClassDirective") {
      yield convertClassDirective(attr, parent, ctx);
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
    if (attr.type === "TransitionDirective") {
      yield convertTransitionDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Transition") {
      yield convertTransitionDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "AnimateDirective") {
      yield convertAnimationDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Animation") {
      yield convertAnimationDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "UseDirective") {
      yield convertActionDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "Action") {
      yield convertActionDirective(attr, parent, ctx);
      continue;
    }
    if (attr.type === "LetDirective") {
      yield convertLetDirective(attr, parent, ctx);
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
        ctx,
      );
    }
    throw new ParseError(
      `Unknown directive or attribute (${attr.type}) are not supported.`,
      attr.start,
      ctx,
    );
  }
}

/** Convert for attribute tokens */
export function* convertAttributeTokens(
  attributes: AttributeToken[],
  parent: SvelteStartTag,
  ctx: Context,
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
        convertAttributeValueTokenToLiteral(attr.value, attribute, ctx),
      );
    }
    yield attribute;
  }
}

/** Convert for Attribute */
function convertAttribute(
  node: SvAST.Attribute | Compiler.Attribute,
  parent: SvelteAttribute["parent"],
  ctx: Context,
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
  const value = node.value as (
    | Compiler.Text
    | Compiler.ExpressionTag
    | SvAST.Text
    | SvAST.MustacheTag
    | SvAST.AttributeShorthand
  )[];
  const shorthand =
    value.find((v) => v.type === "AttributeShorthand") ||
    // for Svelte v5
    (value.length === 1 &&
      value[0].type === "ExpressionTag" &&
      ctx.code[node.start] === "{" &&
      ctx.code[node.end - 1] === "}");
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
    node.value as (
      | SvAST.Text
      | SvAST.MustacheTag
      | Compiler.Text
      | Compiler.ExpressionTag
    )[],
    attribute,
    parent,
    ctx,
  );

  // Not required for shorthands. Therefore, register the token here.
  ctx.addToken("HTMLIdentifier", keyRange);

  return attribute;
}

/** Common process attribute value */
function processAttributeValue(
  nodeValue: (
    | SvAST.Text
    | SvAST.MustacheTag
    | Compiler.Text
    | Compiler.ExpressionTag
  )[],
  attribute: SvelteAttribute | SvelteStyleDirectiveLongform,
  attributeParent: (SvelteAttribute | SvelteStyleDirectiveLongform)["parent"],
  ctx: Context,
) {
  const nodes = nodeValue
    .filter(
      (v) =>
        v.type !== "Text" ||
        // ignore empty
        // https://github.com/sveltejs/svelte/pull/6539
        v.start < v.end,
    )
    .map((v, index, array) => {
      if (v.type === "Text") {
        const next = array[index + 1];
        if (next && next.start < v.end) {
          // Maybe bug in Svelte can cause the completion index to shift.
          return {
            ...v,
            end: next.start,
          };
        }
      }
      return v;
    });
  if (
    nodes.length === 1 &&
    (nodes[0].type === "MustacheTag" || nodes[0].type === "ExpressionTag") &&
    attribute.type === "SvelteAttribute"
  ) {
    const typing = buildAttributeType(
      attributeParent.parent,
      attribute.key.name,
      ctx,
    );
    const mustache = convertMustacheTag(nodes[0], attribute, typing, ctx);
    attribute.value.push(mustache);
    return;
  }
  for (const v of nodes) {
    if (v.type === "Text") {
      attribute.value.push(convertTextToLiteral(v, attribute, ctx));
      continue;
    }
    if (v.type === "ExpressionTag" || v.type === "MustacheTag") {
      const mustache = convertMustacheTag(v, attribute, null, ctx);
      attribute.value.push(mustache);
      continue;
    }
    const u: any = v;
    throw new ParseError(
      `Unknown attribute value (${u.type}) are not supported.`,
      u.start,
      ctx,
    );
  }
}

/** Build attribute type */
function buildAttributeType(
  element: SvelteElement | SvelteScriptElement | SvelteStyleElement,
  attrName: string,
  ctx: Context,
) {
  if (
    svelteVersion.gte(5) &&
    attrName.startsWith("on") &&
    (element.type !== "SvelteElement" || element.kind === "html")
  ) {
    return buildEventHandlerType(element, attrName.slice(2), ctx);
  }
  if (element.type !== "SvelteElement" || element.kind !== "component") {
    return null;
  }
  const elementName = ctx.elements.get(element)!.name;
  const componentPropsType = `import('svelte').ComponentProps<${elementName}>`;
  return conditional({
    check: `'${attrName}'`,
    extends: `infer PROP`,
    true: conditional({
      check: `PROP`,
      extends: `keyof ${componentPropsType}`,
      true: `${componentPropsType}[PROP]`,
      false: `never`,
    }),
    false: `never`,
  });

  /** Generate `C extends E ? T : F` type. */
  function conditional(types: {
    check: string;
    extends: string;
    true: string;
    false: string;
  }) {
    return `${types.check} extends ${types.extends}?(${types.true}):(${types.false})`;
  }
}

/** Convert for Spread */
function convertSpreadAttribute(
  node: SvAST.Spread | Compiler.SpreadAttribute,
  parent: SvelteSpreadAttribute["parent"],
  ctx: Context,
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
  node: SvAST.DirectiveForExpression | Compiler.BindDirective,
  parent: SvelteDirective["parent"],
  ctx: Context,
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
        (es, { getScope }) => {
          directive.expression = es;
          const scope = getScope(es);
          const reference = scope.references.find(
            (ref) => ref.identifier === es,
          );
          if (reference) {
            // The bind directive does read and write.
            reference.isWrite = () => true;
            reference.isWriteOnly = () => false;
            reference.isReadWrite = () => true;
            reference.isReadOnly = () => false;
            reference.isRead = () => true;
          }
        },
      );
    },
  });
  return directive;
}

/** Convert for EventHandler Directive */
function convertEventHandlerDirective(
  node: SvAST.DirectiveForExpression | Compiler.OnDirective,
  parent: SvelteDirective["parent"],
  ctx: Context,
): SvelteEventHandlerDirective {
  const directive: SvelteEventHandlerDirective = {
    type: "SvelteDirective",
    kind: "EventHandler",
    key: null as any,
    expression: null,
    parent,
    ...ctx.getConvertLocation(node),
  };
  const typing = buildEventHandlerType(parent.parent, node.name, ctx);
  processDirective(node, directive, ctx, {
    processExpression: buildProcessExpressionForExpression(
      directive,
      ctx,
      typing,
    ),
  });
  return directive;
}

/** Build event handler type */
function buildEventHandlerType(
  element: SvelteElement | SvelteScriptElement | SvelteStyleElement,
  eventName: string,
  ctx: Context,
) {
  const nativeEventHandlerType = `(e:${conditional({
    check: `'${eventName}'`,
    extends: `infer EVT`,
    true: conditional({
      check: `EVT`,
      extends: `keyof HTMLElementEventMap`,
      true: `HTMLElementEventMap[EVT]`,
      false: `CustomEvent<any>`,
    }),
    false: `never`,
  })})=>void`;
  if (element.type !== "SvelteElement") {
    return nativeEventHandlerType;
  }
  const elementName = ctx.elements.get(element)!.name;
  if (element.kind === "component") {
    const componentEventsType = `import('svelte').ComponentEvents<${elementName}>`;
    return `(e:${conditional({
      check: `0`,
      extends: `(1 & ${componentEventsType})`,
      // `componentEventsType` is `any`
      //   `@typescript-eslint/parser` currently cannot parse `*.svelte` import types correctly.
      //   So if we try to do a correct type parsing, it's argument type will be `any`.
      //   A workaround is to inject the type directly, as `CustomEvent<any>` is better than `any`.
      true: `CustomEvent<any>`,
      // `componentEventsType` has an exact type.
      false: conditional({
        check: `'${eventName}'`,
        extends: `infer EVT`,
        true: conditional({
          check: `EVT`,
          extends: `keyof ${componentEventsType}`,
          true: `${componentEventsType}[EVT]`,
          false: `CustomEvent<any>`,
        }),
        false: `never`,
      }),
    })})=>void`;
  }
  if (element.kind === "special") {
    if (elementName === "svelte:component") return `(e:CustomEvent<any>)=>void`;
    return nativeEventHandlerType;
  }
  const attrName = `on:${eventName}`;
  const svelteHTMLElementsType = "import('svelte/elements').SvelteHTMLElements";
  return conditional({
    check: `'${elementName}'`,
    extends: "infer EL",
    true: conditional({
      check: `EL`,
      extends: `keyof ${svelteHTMLElementsType}`,
      true: conditional({
        check: `'${attrName}'`,
        extends: "infer ATTR",
        true: conditional({
          check: `ATTR`,
          extends: `keyof ${svelteHTMLElementsType}[EL]`,
          true: `${svelteHTMLElementsType}[EL][ATTR]`,
          false: nativeEventHandlerType,
        }),
        false: `never`,
      }),
      false: nativeEventHandlerType,
    }),
    false: `never`,
  });

  /** Generate `C extends E ? T : F` type. */
  function conditional(types: {
    check: string;
    extends: string;
    true: string;
    false: string;
  }) {
    return `${types.check} extends ${types.extends}?(${types.true}):(${types.false})`;
  }
}

/** Convert for Class Directive */
function convertClassDirective(
  node: SvAST.DirectiveForExpression | Compiler.ClassDirective,
  parent: SvelteDirective["parent"],
  ctx: Context,
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
  node: SvAST.StyleDirective | Compiler.StyleDirective,
  parent: SvelteStyleDirective["parent"],
  ctx: Context,
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
            ctx,
          );
        }
        shorthandDirective.key.name = expression;
      },
    );
    return shorthandDirective;
  }
  ctx.addToken("HTMLIdentifier", {
    start: keyName.range[0],
    end: keyName.range[1],
  });

  processAttributeValue(node.value, directive, parent, ctx);

  return directive;
}

/** Convert for Transition Directive */
function convertTransitionDirective(
  node: SvAST.TransitionDirective | Compiler.TransitionDirective,
  parent: SvelteDirective["parent"],
  ctx: Context,
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
      null,
    ),
    processName: (name) =>
      ctx.scriptLet.addExpression(
        name,
        directive.key,
        null,
        buildExpressionTypeChecker(["Identifier"], ctx),
      ),
  });
  return directive;
}

/** Convert for Animation Directive */
function convertAnimationDirective(
  node: SvAST.DirectiveForExpression | Compiler.AnimateDirective,
  parent: SvelteDirective["parent"],
  ctx: Context,
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
      null,
    ),
    processName: (name) =>
      ctx.scriptLet.addExpression(
        name,
        directive.key,
        null,
        buildExpressionTypeChecker(["Identifier"], ctx),
      ),
  });
  return directive;
}

/** Convert for Action Directive */
function convertActionDirective(
  node: SvAST.DirectiveForExpression | Compiler.UseDirective,
  parent: SvelteDirective["parent"],
  ctx: Context,
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
      `Parameters<typeof ${node.name}>[1]`,
    ),
    processName: (name) =>
      ctx.scriptLet.addExpression(
        name,
        directive.key,
        null,
        buildExpressionTypeChecker(["Identifier", "MemberExpression"], ctx),
      ),
  });
  return directive;
}

/** Convert for Let Directive */
function convertLetDirective(
  node: SvAST.LetDirective | Compiler.LetDirective,
  parent: SvelteLetDirective["parent"],
  ctx: Context,
): SvelteLetDirective {
  const directive: SvelteLetDirective = {
    type: "SvelteDirective",
    kind: "Let",
    key: null as any,
    expression: null,
    parent,
    ...ctx.getConvertLocation(node),
  };
  processDirective(node as any, directive, ctx, {
    processPattern(pattern) {
      return ctx.letDirCollections
        .getCollection()
        .addPattern(
          pattern,
          directive,
          buildLetDirectiveType(parent.parent, node.name, ctx),
        );
    },
    processName: node.expression
      ? undefined
      : (name) => {
          // shorthand
          ctx.letDirCollections
            .getCollection()
            .addPattern(
              name,
              directive,
              buildLetDirectiveType(parent.parent, node.name, ctx),
              (es) => {
                directive.expression = es;
              },
            );
          return [];
        },
  });
  return directive;
}

/** Build let directive param type */
function buildLetDirectiveType(
  element: SvelteElement | SvelteScriptElement | SvelteStyleElement,
  letName: string,
  ctx: Context,
) {
  if (element.type !== "SvelteElement") {
    return "any";
  }
  let slotName = "default";
  let componentName: string;
  const svelteNode = ctx.elements.get(element)!;
  const slotAttr = (
    svelteNode.attributes as (
      | SvAST.AttributeOrDirective
      | Compiler.Attribute
      | Compiler.SpreadAttribute
      | Compiler.Directive
    )[]
  ).find((attr): attr is SvAST.Attribute | Compiler.Attribute => {
    return attr.type === "Attribute" && attr.name === "slot";
  });
  if (slotAttr) {
    if (
      Array.isArray(slotAttr.value) &&
      slotAttr.value.length === 1 &&
      slotAttr.value[0].type === "Text"
    ) {
      slotName = slotAttr.value[0].data;
    } else {
      return "any";
    }
    const parent = findParentComponent(element);
    if (parent == null) return "any";
    componentName = ctx.elements.get(parent)!.name;
  } else {
    if (element.kind === "component") {
      componentName = svelteNode.name;
    } else {
      const parent = findParentComponent(element);
      if (parent == null) return "any";
      componentName = ctx.elements.get(parent)!.name;
    }
  }
  return `${String(componentName)}['$$slot_def'][${JSON.stringify(
    slotName,
  )}][${JSON.stringify(letName)}]`;

  /** Find parent component element */
  function findParentComponent(node: SvelteElement) {
    let parent:
      | SvelteElement["parent"]
      | SvelteElseBlock
      | SvelteAwaitBlock
      | null = node.parent;
    while (parent && parent.type !== "SvelteElement") {
      parent = parent.parent;
    }
    if (!parent || parent.kind !== "component") {
      return null;
    }
    return parent;
  }
}

type DirectiveProcessors<
  D extends
    | SvAST.Directive
    | Exclude<Compiler.Directive, Compiler.StyleDirective>,
  S extends SvelteDirective,
  E extends D["expression"] & S["expression"],
> =
  | {
      processExpression: (
        expression: E,
        shorthand: boolean,
      ) => ScriptLetCallback<NonNullable<E>>[];
      processPattern?: undefined;
      processName?: (
        expression: SvelteName,
      ) => ScriptLetCallback<Exclude<S["key"]["name"], SvelteName>>[];
    }
  | {
      processExpression?: undefined;
      processPattern: (
        expression: E,
        shorthand: boolean,
      ) => ScriptLetCallback<NonNullable<E>>[];
      processName?: (
        expression: SvelteName,
      ) => ScriptLetCallback<Exclude<S["key"]["name"], SvelteName>>[];
    };

/** Common process for directive */
function processDirective<
  D extends
    | SvAST.Directive
    | Exclude<Compiler.Directive, Compiler.StyleDirective>,
  S extends SvelteDirective,
  E extends D["expression"] & S["expression"],
>(
  node: D & { expression: null | E },
  directive: S,
  ctx: Context,
  processors: DirectiveProcessors<D, S, E>,
) {
  processDirectiveKey(node, directive, ctx);
  processDirectiveExpression<D, S, E>(node, directive, ctx, processors);
}

/** Common process for directive key */
function processDirectiveKey<
  D extends
    | SvAST.Directive
    | SvAST.StyleDirective
    | Compiler.Directive
    | Compiler.StyleDirective,
  S extends SvelteDirective | SvelteStyleDirective,
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
      nextStart,
    );
    ctx.addToken("HTMLIdentifier", { start: nextStart, end: nextEnd });
    while (ctx.code[nextEnd] === "|") {
      nextStart = nextEnd + 1;
      nextEnd = indexOf(
        ctx.code,
        (c) => c === "=" || c === ">" || c === "/" || c === "|" || !c.trim(),
        nextStart,
      );
      ctx.addToken("HTMLIdentifier", { start: nextStart, end: nextEnd });
    }
    keyEndIndex = nextEnd;
  }

  const key = (directive.key = {
    type: "SvelteDirectiveKey",
    name: null as any,
    modifiers: getModifiers(node),
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
  D extends
    | SvAST.Directive
    | Exclude<Compiler.Directive, Compiler.StyleDirective>,
  S extends SvelteDirective,
  E extends D["expression"],
>(
  node: D & { expression: null | E },
  directive: S,
  ctx: Context,
  processors: DirectiveProcessors<D, S, E>,
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
            ctx,
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
  typing: string | null,
): (expression: ESTree.Expression) => ScriptLetCallback<ESTree.Expression>[] {
  return (expression) => {
    if (hasTypeInfo(expression)) {
      return ctx.scriptLet.addExpression(expression, directive, null);
    }
    return ctx.scriptLet.addExpression(expression, directive, typing);
  };
}

/** Build expression type checker to script let callbacks */
function buildExpressionTypeChecker<T extends ESTree.Expression>(
  expected: T["type"][],
  ctx: Context,
): ScriptLetCallback<T> {
  return (node) => {
    if (!expected.includes(node.type)) {
      throw new ParseError(
        `Expected JS ${expected.join(", or ")}, but ${node.type} found.`,
        node.range![0],
        ctx,
      );
    }
  };
}
