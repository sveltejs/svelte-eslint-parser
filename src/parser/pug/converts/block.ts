import type {
  SveltePugEachBlock,
  SveltePugElement,
  SveltePugTemplateElement,
  SveltePugText,
} from "../../../ast";
import type { PugContext } from "../context";
import type { PugBlock, PugBlockChild } from "../pug-ast";
import { convertMixin } from "./mixin";
import { convertTag } from "./tag";
import { convertText } from "./text";

type BlockChild = SveltePugEachBlock | SveltePugElement | SveltePugText;

/** Convert for pug block */
export function convertBlock(
  node: PugBlock,
  parent: SveltePugTemplateElement | SveltePugEachBlock | SveltePugElement,
  ctx: PugContext
): BlockChild[] {
  return node.nodes.map((c) => convertChildNode(c, parent, ctx));
}

/** Convert for pug block */
function convertChildNode(
  node: PugBlockChild,
  parent: SveltePugTemplateElement | SveltePugEachBlock | SveltePugElement,
  ctx: PugContext
): BlockChild {
  if (node.type === "Mixin") {
    return convertMixin(node, parent, ctx);
  }
  if (node.type === "Tag") {
    return convertTag(node, parent, ctx);
  }
  if (node.type === "Text") {
    return convertText(node, parent, ctx);
  }
  throw new Error(`Unknown type:${(node as any).type}`);
}
