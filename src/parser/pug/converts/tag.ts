import type {
  SvelteName,
  SveltePugElement,
  SveltePugHTMLElement,
} from "../../../ast";
import type { PugContext } from "../context";
import type { PugBlock, PugTag } from "../pug-ast";
import type PugLexer from "pug-lexer";
import { convertAttrs } from "./attrs";
import { convertBlock } from "./block";
import { setEndLocation } from "./common";

/** Convert for pug tag */
export function convertTag(
  node: PugTag,
  parent: SveltePugElement["parent"],
  ctx: PugContext
): SveltePugElement {
  if (/[A-Z]/u.test(node.name)) {
    // Component
    throw new Error(`TODO implement Component`);
  }
  if (node.name.includes(":")) {
    // Special components e.g. svelte:window
    throw new Error(`TODO implement Special components`);
  }

  return convertHTMLElement(node, parent, ctx);
}

/** Convert for HTMLElement */
function convertHTMLElement(
  node: PugTag,
  parent: SveltePugHTMLElement["parent"],
  ctx: PugContext
): SveltePugHTMLElement {
  const tagToken = ctx.eatToken({ skipSpaces: true, expected: ["tag"] });
  let token: PugLexer.TagToken | PugLexer.IdToken | PugLexer.ClassToken | null =
    tagToken;
  if (!token) {
    token = ctx.peekToken({ skipSpaces: true, expected: ["id", "class"] });
  }
  const nameNode: SvelteName = {
    type: "SvelteName",
    name: node.name,
    rawName: token.type === "tag" ? node.name : token.type === "id" ? "#" : ".",
    parent: null as any,
    ...ctx.getConvertLocation({
      start: token.loc.start,
      end:
        token.type === "tag"
          ? token.loc.end
          : {
              line: token.loc.start.line,
              column: token.loc.start.column + 1,
            },
    }),
  };
  if (tagToken) {
    ctx.ctx.addToken("HTMLIdentifier", {
      start: nameNode.range[0],
      end: nameNode.range[1],
    });
  }
  const element: SveltePugHTMLElement = {
    type: "SveltePugElement",
    kind: "html",
    name: nameNode,
    attributes: null,
    children: [],
    parent,
    ...ctx.getConvertLocation(token.loc),
  };
  nameNode.parent = element;

  ctx.ctx.letDirCollections.beginExtract();

  element.attributes = convertAttrs(node, element, ctx);

  const lets = ctx.ctx.letDirCollections.extract();
  if (!lets.getLetParams().length && !needScopeByChildren(node)) {
    element.children.push(...convertBlock(node.block, element, ctx));
  } else {
    ctx.ctx.scriptLet.nestBlock(element, lets.getLetParams());
    element.children.push(...convertBlock(node.block, element, ctx));
    ctx.ctx.scriptLet.closeScope();
  }

  setEndLocation(
    element,
    element.children[element.children.length - 1] || element.attributes
  );

  return element;
}

/** Check if children needs a scope. */
function needScopeByChildren(fragment: { block: PugBlock }): boolean {
  for (const child of fragment.block.nodes) {
    if (child.type === "Mixin" && child.call && child.name === "const") {
      return true;
    }
  }
  return false;
}
