import type ESTree from "estree";
import type { BaseNode } from "./base";
import type {
  SvelteElement,
  SvelteEndTag as HTMLEndTag,
  SvelteLiteral,
  SvelteMemberExpressionName,
  SvelteMustacheTag,
  SvelteMustacheTagText,
  SvelteName,
  SvelteProgram,
  SvelteStartTag as HTMLStartTag,
  SvelteText,
} from "./html";

export type SveltePugNode =
  | SveltePugTemplateElement
  | SveltePugEachBlock
  | SveltePugElement
  | SveltePugAttributes
  | SveltePugAttribute
  | SveltePugAttributeSet
  | SveltePugAttributeBlock
  | SveltePugSpreadAttribute;

type Child = SveltePugEachBlock | SveltePugElement | SveltePugText;

/** Node of `<template lang="pug">` element. */
export interface SveltePugTemplateElement extends BaseNode {
  type: "SveltePugTemplateElement";
  name: SvelteName;
  startTag: HTMLStartTag;
  children: Child[];
  endTag: HTMLEndTag | null;
  parent: SvelteProgram;
}

/** Node of text. */
export interface SveltePugText extends BaseNode {
  type: "SveltePugText";
  body: (SvelteElement | SvelteText | SvelteMustacheTag)[];
  parent: SveltePugTemplateElement | SveltePugElement | SveltePugEachBlock;
}

/** Node of elements. */
export type SveltePugElement =
  | SveltePugHTMLElement
  | SveltePugComponentElement
  | SveltePugSpecialElement;

/** Node of HTML element. */
export interface SveltePugHTMLElement extends BaseNode {
  type: "SveltePugElement";
  kind: "html";
  name: SvelteName;
  attributes: SveltePugAttributes | null;
  children: Child[];
  parent: SveltePugTemplateElement | SveltePugElement | SveltePugEachBlock;
}

/** Node of Svelte component element. */
export interface SveltePugComponentElement extends BaseNode {
  type: "SveltePugElement";
  kind: "component";
  name: ESTree.Identifier | SvelteMemberExpressionName;
  attributes: SveltePugAttributes | null;
  children: Child[];
  parent: SveltePugTemplateElement | SveltePugElement | SveltePugEachBlock;
}
/** Node of Svelte special component element. e.g. `svelte:window` */
export interface SveltePugSpecialElement extends BaseNode {
  type: "SveltePugElement";
  kind: "special";
  name: SvelteName;
  attributes: SveltePugAttributes | null;
  children: Child[];
  parent: SveltePugTemplateElement | SveltePugElement | SveltePugEachBlock;
}

/** Node of `+each`. */
export interface SveltePugEachBlock extends BaseNode {
  type: "SveltePugEachBlock";
  expression: ESTree.Expression;
  context: ESTree.Pattern;
  index: ESTree.Identifier | null;
  key: ESTree.Expression | null;
  children: Child[];
  else: null;
  // TODO: support else
  // else: SveltePugElseBlockAlone | null;
  parent: SveltePugTemplateElement | SveltePugEachBlock | SveltePugElement;
}
/** Node of attributes. */
export interface SveltePugAttributes extends BaseNode {
  type: "SveltePugAttributes";
  attributes: (
    | SveltePugIdAttribute
    | SveltePugClassAttribute
    | SveltePugAttributeSet
    | SveltePugAttributeBlock
  )[];
  parent: SveltePugElement;
}

interface BaseSveltePugAttribute extends BaseNode {
  type: "SveltePugAttribute";
  key: SvelteName;
  boolean: boolean;
  value: (SvelteLiteral | SvelteMustacheTagText)[];
  parent: SveltePugAttributes | SveltePugAttributeSet;
}
export type SveltePugAttribute =
  | SveltePugAttributePlain
  | SveltePugIdAttribute
  | SveltePugClassAttribute;
/** Node of attribute. */
export interface SveltePugAttributePlain extends BaseSveltePugAttribute {
  kind: "attribute";
  parent: SveltePugAttributeSet;
}
/** Node of #id attribute. */
export interface SveltePugIdAttribute extends BaseSveltePugAttribute {
  kind: "id";
  boolean: false;
  parent: SveltePugAttributes;
}
/** Node of .class attribute. */
export interface SveltePugClassAttribute extends BaseSveltePugAttribute {
  kind: "class";
  boolean: false;
  parent: SveltePugAttributes;
}
/** Node of () attributes. */
export interface SveltePugAttributeSet extends BaseNode {
  type: "SveltePugAttributeSet";
  elements: (SveltePugAttributePlain | SveltePugSpreadAttribute)[];
  parent: SveltePugAttributes;
}
/** Node of $attributes(). */
export interface SveltePugAttributeBlock extends BaseNode {
  type: "SveltePugAttributeBlock";
  parent: SveltePugAttributes;
}

/** Node of spread attribute. */
export interface SveltePugSpreadAttribute extends BaseNode {
  type: "SveltePugSpreadAttribute";
  argument: ESTree.Expression;
  parent: SveltePugAttributeSet;
}
