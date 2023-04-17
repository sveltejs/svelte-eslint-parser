import type { Node, Container } from "postcss";
import type { BaseNode } from "./base";

export type ESLintCompatiblePostCSSNode<PostCSSNode extends Node = Node> = Omit<
  PostCSSNode,
  "type"
> &
  BaseNode &
  (PostCSSNode extends Container<infer Child>
    ? Container<ESLintCompatiblePostCSSNode<Child>>
    : any);
