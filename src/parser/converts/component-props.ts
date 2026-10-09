import type ESTree from "estree";
import type { SvelteElement } from "../../ast/index.js";
import type { Context } from "../../context/index.js";
import type * as SvAST from "../svelte-ast-types.js";
import type * as Compiler from "../svelte-ast-types-for-v5.js";
import { svelteVersion } from "../svelte-version.js";
import { GENERIC_PROPS_INFERENCE_KEY } from "../typescript/analyze/component.js";
import { getWithLoc } from "./common.js";

/** Props type text of a component element, used to type what it is passed. */
export function getComponentPropsType(
  element: SvelteElement,
  ctx: Context,
): string {
  const propsType =
    ctx.componentPropsTypes.get(element) ?? getDeclaredPropsType(element, ctx);
  const staticType = getStaticAttributesType(
    ctx.elements.get(element) as SvAST.InlineComponent | Compiler.Component,
  );
  if (staticType == null) {
    return propsType;
  }
  // Static values such as `mode="single"` select the matching members of a
  // discriminated union, as passing the whole props object does. Values that
  // fit no member keep the declared props.
  const narrowed = `${propsType} & ${staticType}`;
  return `([${narrowed}] extends [never] ? ${propsType} : ${narrowed})`;
}

/** Literal type of the attributes whose values are fixed in the markup. */
function getStaticAttributesType(
  node: SvAST.InlineComponent | Compiler.Component,
): string | null {
  const members: string[] = [];
  for (const attr of node.attributes as Compiler.Component["attributes"]) {
    if (attr.type !== "Attribute") {
      continue;
    }
    const key = JSON.stringify(attr.name);
    if (attr.value === true) {
      members.push(`${key}: true`);
    } else if (
      Array.isArray(attr.value) &&
      attr.value.every((value) => value.type === "Text")
    ) {
      const text = attr.value.map((value) => value.data).join("");
      members.push(`${key}: ${JSON.stringify(text)}`);
    }
  }
  return members.length ? `{ ${members.join("; ")} }` : null;
}

/** Props type the component declares, before anything passed to it. */
function getDeclaredPropsType(element: SvelteElement, ctx: Context): string {
  const elementName = ctx.elements.get(element)!.name;
  // Svelte 3/4 ComponentProps takes an instance, while Svelte 5 also accepts
  // the component function. Extract the legacy constructor instance without
  // relying on a locally shadowable utility type such as InstanceType.
  return svelteVersion.gte(5)
    ? `import('svelte').ComponentProps<typeof ${elementName}>`
    : `(typeof ${elementName} extends new (...args: any[]) => (infer C extends import('svelte').SvelteComponent) ? import('svelte').ComponentProps<C> : never)`;
}

/**
 * Let a generic component infer its type arguments from the attributes it is
 * given, as a component call does in svelte2tsx output. Function attributes are
 * left out: they are typed from the inferred props, not the other way around.
 */
export function prepareGenericComponentProps(
  element: SvelteElement,
  node: SvAST.InlineComponent | Compiler.Component,
  ctx: Context,
): void {
  if (!ctx.isTypeScript() || !svelteVersion.gte(5)) {
    return;
  }
  const entries: string[] = [];
  for (const attr of node.attributes as Compiler.Component["attributes"]) {
    if (attr.type === "Attribute") {
      const value = Array.isArray(attr.value)
        ? attr.value.length === 1
          ? attr.value[0]
          : null
        : attr.value;
      if (value !== true && value?.type === "ExpressionTag") {
        pushEntry(JSON.stringify(attr.name), value.expression);
      }
    } else if (attr.type === "BindDirective") {
      if (attr.expression.type !== "SequenceExpression") {
        pushEntry(JSON.stringify(attr.name), attr.expression);
      }
    } else if (attr.type === "SpreadAttribute") {
      pushEntry(null, attr.expression);
    }
  }
  if (!entries.length) {
    return;
  }
  const elementName = ctx.elements.get(element)!.name;
  const id = ctx.scriptLet.addGenericPropsInference(
    elementName,
    GENERIC_PROPS_INFERENCE_KEY,
    entries,
  );
  // `any` means the component is not generic or inference failed.
  ctx.componentPropsTypes.set(
    element,
    `(0 extends 1 & typeof ${id} ? ${getDeclaredPropsType(element, ctx)} : typeof ${id})`,
  );

  function pushEntry(key: string | null, expression: ESTree.Node) {
    if (
      expression.type === "ArrowFunctionExpression" ||
      expression.type === "FunctionExpression"
    ) {
      return;
    }
    const { start, end } = getWithLoc(expression);
    const text = ctx.code.slice(start, end);
    entries.push(key == null ? `...(${text})` : `${key}:(${text})`);
  }
}
