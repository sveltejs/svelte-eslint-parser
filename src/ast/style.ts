import type {
  AtRule,
  ChildNode,
  ChildProps,
  Comment,
  Container,
  Declaration,
  Node,
  Root,
  Rule,
} from "postcss";
import type { Locations } from "./common";
import type { SvelteStyleElement } from "./html";

type RedefinedProperties =
  | "type" // Redefined for all nodes to include the "SvelteStyle-" prefix
  | "parent" // Redefined for Root
  | "walk" // The rest are redefined for Container
  | "walkDecls"
  | "walkRules"
  | "walkAtRules"
  | "walkComments"
  | "append"
  | "prepend";

type ESLintCompatiblePostCSSContainer<
  PostCSSNode extends Node,
  Child extends Node
> = Omit<Container<ESLintCompatiblePostCSSNode<Child>>, RedefinedProperties> & {
  walk(
    callback: (
      node: ESLintCompatiblePostCSSNode<ChildNode>,
      index: number
    ) => false | void
  ): false | undefined;
  walkDecls(
    propFilter: string | RegExp,
    callback: (
      decl: ESLintCompatiblePostCSSNode<Declaration>,
      index: number
    ) => false | void
  ): false | undefined;
  walkDecls(
    callback: (
      decl: ESLintCompatiblePostCSSNode<Declaration>,
      index: number
    ) => false | void
  ): false | undefined;
  walkRules(
    selectorFilter: string | RegExp,
    callback: (
      rule: ESLintCompatiblePostCSSNode<Rule>,
      index: number
    ) => false | void
  ): false | undefined;
  walkRules(
    callback: (
      rule: ESLintCompatiblePostCSSNode<Rule>,
      index: number
    ) => false | void
  ): false | undefined;
  walkAtRules(
    nameFilter: string | RegExp,
    callback: (
      atRule: ESLintCompatiblePostCSSNode<AtRule>,
      index: number
    ) => false | void
  ): false | undefined;
  walkAtRules(
    callback: (
      atRule: ESLintCompatiblePostCSSNode<AtRule>,
      index: number
    ) => false | void
  ): false | undefined;
  walkComments(
    callback: (
      comment: ESLintCompatiblePostCSSNode<Comment>,
      indexed: number
    ) => false | void
  ): false | undefined;
  walkComments(
    callback: (
      comment: ESLintCompatiblePostCSSNode<Comment>,
      indexed: number
    ) => false | void
  ): false | undefined;
  append(
    ...nodes: (
      | ESLintCompatiblePostCSSNode<Node>
      | ESLintCompatiblePostCSSNode<Node>[]
      | ChildProps
      | ChildProps[]
      | string
      | string[]
    )[]
  ): ESLintCompatiblePostCSSNode<PostCSSNode>;
  prepend(
    ...nodes: (
      | ESLintCompatiblePostCSSNode<Node>
      | ESLintCompatiblePostCSSNode<Node>[]
      | ChildProps
      | ChildProps[]
      | string
      | string[]
    )[]
  ): ESLintCompatiblePostCSSNode<PostCSSNode>;
};

export type ESLintCompatiblePostCSSNode<PostCSSNode extends Node> =
  // The following hack makes the `type` property work for type narrowing, see microsoft/TypeScript#53887.
  PostCSSNode extends any
    ? Locations &
        Omit<PostCSSNode, RedefinedProperties> & {
          type: `SvelteStyle-${PostCSSNode["type"]}`;
        } & (PostCSSNode extends Container<infer Child>
          ? ESLintCompatiblePostCSSContainer<PostCSSNode, Child>
          : unknown) &
        (PostCSSNode extends Root
          ? {
              parent: SvelteStyleElement;
            }
          : {
              parent: PostCSSNode["parent"];
            })
    : never;
