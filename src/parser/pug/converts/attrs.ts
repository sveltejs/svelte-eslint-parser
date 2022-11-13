import type {
  SveltePugAttributePlain,
  SveltePugAttributes,
  SveltePugAttributeSet,
  SveltePugClassAttribute,
  SveltePugIdAttribute,
  SveltePugSpreadAttribute,
} from "../../../ast";
import type { PugContext } from "../context";
import type { PugAttr, PugAttrBlock, PugMixinCall, PugTag } from "../pug-ast";
import type PugLexer from "pug-lexer";
import { setEndLocation } from "./common";
import { ParseError } from "../../..";
import { parseSvelteAttributeKey } from "./svelte-fragment-parser";
import type * as SvAST from "../../svelte-ast-types";

/** Convert for pug attributes */
export function convertAttrs(
  node: PugTag | PugMixinCall,
  parent: SveltePugAttributes["parent"],
  ctx: PugContext
): SveltePugAttributes | null {
  const attrs = getSortedAttributes(node);

  const startToken = ctx.peekToken({ skipSpaces: false });
  if (
    !["id", "class", "start-attributes", "&attributes"].includes(
      startToken.type
    ) &&
    attrs.length === 0
  ) {
    return null;
  }

  const attrsNode: SveltePugAttributes = {
    type: "SveltePugAttributes",
    attributes: [],
    parent,
    ...ctx.getConvertLocation(startToken.loc),
  };

  while (attrs.length) {
    const attr = attrs[0];
    if (attr.type === "Attr") {
      attrsNode.attributes.push(convertAttr(attrs, attrsNode, ctx));
    } else {
      throw new Error(`TODO implement other attribute ${attr.type}`);
    }
  }

  setEndLocation(
    attrsNode,
    attrsNode.attributes[attrsNode.attributes.length - 1]
  );

  return attrsNode;
}

/** Convert for pug attribute */
function convertAttr(
  attrs: SortedAttrs,
  parent: SveltePugAttributes,
  ctx: PugContext
): SveltePugIdAttribute | SveltePugClassAttribute | SveltePugAttributeSet {
  const firstToken = ctx.expectToken({
    skipSpaces: true,
    expected: ["id", "class", "start-attributes"],
  });
  if (firstToken.type === "start-attributes") {
    return convertAttributeSet(attrs, firstToken, parent, ctx);
  }
  throw new Error(`TODO implement other token ${firstToken.type}`);
}

/** Convert for () attributes */
function convertAttributeSet(
  attrs: SortedAttrs,
  firstToken: PugLexer.StartAttributesToken,
  parent: SveltePugAttributes,
  ctx: PugContext
): SveltePugAttributeSet {
  const attributeSet: SveltePugAttributeSet = {
    type: "SveltePugAttributeSet",
    elements: [],
    parent,
    ...ctx.getConvertLocation(firstToken.loc),
  };

  let token = ctx.expectToken({
    skipSpaces: true,
    expected: ["attribute", "end-attributes"],
  });
  while (token.type !== "end-attributes") {
    const node = attrs.shift();
    if (node?.type !== "Attr") {
      throw new ParseError(
        `Expected attribute, but other token found.`,
        node ? ctx.getSvelteIndex(node) : ctx.getSvelteIndex(token.loc.start),
        ctx.ctx
      );
    }

    attributeSet.elements.push(
      convertAttribute(node, token, attributeSet, ctx)
    );

    token = ctx.expectToken({
      skipSpaces: true,
      expected: ["attribute", "end-attributes"],
    });
  }

  setEndLocation(attributeSet, ctx.getConvertLocation(token.loc));

  return attributeSet;
}

/** Convert for attribute */
function convertAttribute(
  node: PugAttr,
  token: PugLexer.AttributeToken,
  parent: SveltePugAttributeSet,
  ctx: PugContext
): SveltePugAttributePlain | SveltePugSpreadAttribute {
  const startIndex = ctx.getSvelteIndex(node);
  let keyStartIndex = startIndex;
  let keyEndIndex = keyStartIndex + node.name.length;
  if (ctx.ctx.code[startIndex] !== node.name[0]) {
    // Quoted attribute key
    keyStartIndex++;
    const endQuoteIndex = keyStartIndex + node.name.length;
    keyEndIndex = endQuoteIndex + 1;
  }
  const attr = parseSvelteAttributeKey(node.name, keyStartIndex, ctx);
  if (attr.type === "Spread") {
    if (token.val !== true) {
      throw new ParseError(`Unexpected attribute value.`, keyEndIndex, ctx.ctx);
    }
    return convertSpreadAttribute(attr, parent, ctx);
  }

  // TODO
  throw new Error(`TODO implement other attribute ${node.name}`);
}

/** Convert for Spread */
function convertSpreadAttribute(
  node: SvAST.Spread,
  parent: SveltePugAttributeSet,
  ctx: PugContext
): SveltePugSpreadAttribute {
  const attribute: SveltePugSpreadAttribute = {
    type: "SveltePugSpreadAttribute",
    argument: null as any,
    parent,
    ...ctx.ctx.getConvertLocation(node),
  };

  const spreadStart = ctx.ctx.code.indexOf("...", node.start);
  ctx.ctx.addToken("Punctuator", {
    start: spreadStart,
    end: spreadStart + 3,
  });

  ctx.ctx.scriptLet.addExpression(node.expression, attribute, null, (es) => {
    attribute.argument = es;
  });

  return attribute;
}

type SortedAttrs = ((PugAttr & { type: "Attr" }) | PugAttrBlock)[];

/** Get the sorted attributes from given node */
function getSortedAttributes(node: PugTag | PugMixinCall): SortedAttrs {
  const attrs = [
    ...node.attrs.map((attr): PugAttr & { type: "Attr" } => {
      return {
        type: "Attr",
        ...attr,
      };
    }),
    ...node.attributeBlocks,
  ];
  return attrs.sort((a, b) => {
    return a.line - b.line || a.column - b.column;
  });
}
