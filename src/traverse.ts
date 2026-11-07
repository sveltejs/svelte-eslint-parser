import type { VisitorKeys } from "eslint-visitor-keys";
import { KEYS } from "./visitor-keys.js";
import type ESTree from "estree";
import type { SvelteNode } from "./ast/index.js";
import type { TSESTree } from "@typescript-eslint/types";
import type { VisitorKeys as TSESVisitorKeys } from "@typescript-eslint/visitor-keys";

/**
 * Check that the given key should be traversed or not.
 * @this {Traversable}
 * @param key The key to check.
 * @returns `true` if the key should be traversed.
 */
function fallbackKeysFilter(this: any, key: string): boolean {
  let value = null;
  return (
    key !== "comments" &&
    key !== "leadingComments" &&
    key !== "loc" &&
    key !== "parent" &&
    key !== "range" &&
    key !== "tokens" &&
    key !== "trailingComments" &&
    (value = this[key]) !== null &&
    typeof value === "object" &&
    (typeof value.type === "string" || Array.isArray(value))
  );
}

/**
 * Get the keys of the given node to traverse it.
 * @param node The node to get.
 * @returns The keys to traverse.
 */
export function getFallbackKeys(node: any): string[] {
  return Object.keys(node).filter(fallbackKeysFilter, node);
}

/**
 * Get the keys of the given node to traverse it.
 * @param node The node to get.
 * @returns The keys to traverse.
 */
export function getKeys(
  node: any,
  visitorKeys?: VisitorKeys | TSESVisitorKeys,
): string[] {
  const keys = (visitorKeys || KEYS)[node.type] || getFallbackKeys(node);

  return keys.filter((key) => !getNodes(node, key).next().done);
}

/**
 * Get the nodes of the given node.
 * @param node The node to get.
 */
export function* getNodes(
  node: any,
  key: string,
): IterableIterator<SvelteNode | ESTree.Node | TSESTree.Node> {
  const child = node[key];
  if (Array.isArray(child)) {
    for (const c of child) {
      if (isNode(c)) {
        yield c;
      }
    }
  } else if (isNode(child)) {
    yield child;
  }
}

/**
 * Check whether a given value is a node.
 * @param x The value to check.
 * @returns `true` if the value is a node.
 */
function isNode(x: any): x is SvelteNode {
  return x !== null && typeof x === "object" && typeof x.type === "string";
}

/**
 * Traverse the given node.
 * @param node The node to traverse.
 * @param parent The parent node.
 * @param visitor The node visitor.
 */
function traverse<N extends SvelteNode | ESTree.Node | TSESTree.Node>(
  node: N,
  parent: N | null,
  visitor: Visitor<N>,
): void {
  visitor.enterNode(node, parent);

  const keys = getKeys(node, visitor.visitorKeys);
  for (const key of keys) {
    for (const child of getNodes(node, key)) {
      traverse(child, node, visitor);
    }
  }

  visitor.leaveNode(node, parent);
}

//------------------------------------------------------------------------------
// Exports
//------------------------------------------------------------------------------

export interface Visitor<N> {
  visitorKeys?: VisitorKeys | TSESVisitorKeys;
  enterNode(node: N, parent: N | null): void;
  leaveNode(node: N, parent: N | null): void;
}

export function traverseNodes(
  node: SvelteNode,
  visitor: Visitor<SvelteNode | ESTree.Node>,
): void;
export function traverseNodes(
  node: ESTree.Node,
  visitor: Visitor<ESTree.Node>,
): void;
export function traverseNodes(
  node: TSESTree.Node,
  visitor: Visitor<TSESTree.Node>,
): void;
export function traverseNodes(
  node: ESTree.Node | TSESTree.Node,
  visitor: Visitor<ESTree.Node | TSESTree.Node>,
): void;
/**
 * Traverse the given AST tree.
 * @param node Root node to traverse.
 * @param visitor Visitor.
 */
export function traverseNodes(
  node: ESTree.Node | SvelteNode | TSESTree.Node,
  visitor: Visitor<SvelteNode | ESTree.Node | TSESTree.Node>,
): void {
  traverse(node, null, visitor);
}

/**
 * typescript-eslint defines some deprecated properties as getters that return
 * node copies (e.g. `TSEnumDeclaration.members`, `TSMappedType.typeParameter`).
 * The copies are not in the visitor keys, so `traverseNodes()` skips them.
 * This wraps the getters of the given node to call `enterNode` for the copies
 * when they are first read. The getters are not read here, because reading
 * them may emit deprecation warnings.
 * @param node The node to wrap the getters of.
 * @param visitorKeys The visitor keys to traverse the copies.
 * @param enterNode Called for each node in the copies.
 */
export function onDeprecatedGetterRead(
  node: any,
  visitorKeys: VisitorKeys | TSESVisitorKeys | undefined,
  enterNode: (node: any) => void,
): void {
  for (const key of Object.getOwnPropertyNames(node)) {
    const descriptor = Object.getOwnPropertyDescriptor(node, key)!;
    if (!descriptor.get || !descriptor.configurable) {
      continue;
    }
    let read = false;
    Object.defineProperty(node, key, {
      ...descriptor,
      get() {
        const value = descriptor.get!.call(this);
        if (!read) {
          read = true;
          for (const child of Array.isArray(value) ? value : [value]) {
            if (isNode(child)) {
              traverseNodes(child, {
                visitorKeys,
                enterNode,
                leaveNode() {
                  // noop
                },
              });
            }
          }
        }
        return value;
      },
    });
  }
}
