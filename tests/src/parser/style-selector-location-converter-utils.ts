import type { AnyNode, Root } from "postcss";
import type { Node as SelectorNode } from "postcss-selector-parser";

import type { SourceLocation } from "../../../src/ast/common.js";

export function extractSelectorLocations(
  services: Record<string, any>,
  styleAST: Root,
): [string, Partial<SourceLocation>][][] {
  const locations: [string, Partial<SourceLocation>][][] = [];
  styleAST.walk((node: AnyNode) => {
    if (node.type === "rule") {
      const selectorAst = services.getStyleSelectorAST(node);
      const selectorLocations: [string, Partial<SourceLocation>][] = [];
      selectorAst.walk((selectorNode: SelectorNode) => {
        selectorLocations.push([
          selectorNode.type,
          services.styleSelectorNodeLoc(selectorNode, node),
        ]);
      });
      locations.push(selectorLocations);
    }
  });
  return locations;
}
