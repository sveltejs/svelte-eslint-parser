import type { Node, ChildProps, Container } from "postcss";
import type { Locations } from "./common";

type ESLintCompatiblePostCSSContainer<
  PostCSSNode extends Node,
  Child extends Node
> = {
  each(
    callback: (
      node: ESLintCompatiblePostCSSNode<Child>,
      index: number
    ) => false | void
  ): false | undefined;
  every(
    condition: (
      node: ESLintCompatiblePostCSSNode<Child>,
      index: number,
      nodes: ESLintCompatiblePostCSSNode<Child>[]
    ) => boolean
  ): boolean;
  get first(): ESLintCompatiblePostCSSNode<Child> | undefined;
  index(child: ESLintCompatiblePostCSSNode<Child> | number): number;
  insertAfter(
    oldNode: ESLintCompatiblePostCSSNode<Child> | number,
    newNode:
      | ESLintCompatiblePostCSSNode<Child>
      | ChildProps
      | string
      | ESLintCompatiblePostCSSNode<Child>[]
      | ChildProps[]
      | string[]
  ): ESLintCompatiblePostCSSNode<PostCSSNode>;
  insertBefore(
    oldNode: ESLintCompatiblePostCSSNode<Child> | number,
    newNode:
      | ESLintCompatiblePostCSSNode<Child>
      | ChildProps
      | string
      | ESLintCompatiblePostCSSNode<Child>[]
      | ChildProps[]
      | string[]
  ): ESLintCompatiblePostCSSNode<PostCSSNode>;
  get last(): ESLintCompatiblePostCSSNode<Child> | undefined;
  nodes: ESLintCompatiblePostCSSNode<Child>[];
  push(
    child: ESLintCompatiblePostCSSNode<Child>
  ): ESLintCompatiblePostCSSNode<PostCSSNode>;
  removeChild(
    child: ESLintCompatiblePostCSSNode<Child> | number
  ): ESLintCompatiblePostCSSNode<PostCSSNode>;
  some(
    condition: (
      node: ESLintCompatiblePostCSSNode<Child>,
      index: number,
      nodes: ESLintCompatiblePostCSSNode<Child>[]
    ) => boolean
  ): boolean;
  walk(
    callback: (
      node: ESLintCompatiblePostCSSNode<Child>,
      index: number
    ) => false | void
  ): false | undefined;
};

export type ESLintCompatiblePostCSSNode<PostCSSNode extends Node> =
  PostCSSNode extends any
    ? Locations &
        Omit<
          PostCSSNode,
          | "type"
          | "each"
          | "every"
          | "first"
          | "index"
          | "insertAfter"
          | "insertBefore"
          | "last"
          | "nodes"
          | "push"
          | "removeChild"
          | "some"
          | "walk"
        > & {
          type: `SvelteStyle-${PostCSSNode["type"]}`;
        } & (PostCSSNode extends Container<infer Child>
          ? ESLintCompatiblePostCSSContainer<PostCSSNode, Child>
          : unknown)
    : never;
