export type PugBlock = {
  type: "Block";
  nodes: PugBlockChild[];
  line: number;
};

export type PugBlockChild = PugMixin | PugTag | PugText;

export type PugMixinCall = {
  // +foo
  type: "Mixin";
  name: string;
  args: null | string;
  block: PugBlock | null;
  call: true;
  attrs: PugAttr[];
  attributeBlocks: PugAttrBlock[];
  line: number;
  column: number;
};

export type PugMixinDef = {
  // mixin foo
  type: "Mixin";
  name: string;
  args: null | string;
  block: PugBlock;
  call: false;
  line: number;
  column: number;
};
export type PugMixin = PugMixinCall | PugMixinDef;

export type PugTag = {
  type: "Tag";
  name: string;
  selfClosing: boolean;
  block: PugBlock;
  attrs: PugAttr[];
  attributeBlocks: PugAttrBlock[];
  isInline: boolean;
  line: number;
  column: number;
};

export type PugText = {
  type: "Text";
  val: string;
  isHtml?: true;
  line: number;
  column: number;
};

export type PugAttr = {
  name: string;
  val: string | boolean;
  line: number;
  column: number;
  mustEscape: boolean;
};
export type PugAttrBlock = {
  type: "AttributeBlock";
  val: string;
  line: number;
  column: number;
};
