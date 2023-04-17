import type { Node, Container } from "postcss";
import type { BaseNode } from "./base";

export type ESLintCompatiblePostCSSNode<PostCSSNode extends Node = Node> =
  BaseNode &
    (PostCSSNode extends Container<infer Child>
      ? Omit<PostCSSNode, "parent" | "type"> &
          Omit<
            Container<ESLintCompatiblePostCSSNode<Child>>,
            "parent" | "walk"
          > & {
            parent: BaseNode;
            walk(
              callback: (
                node: ESLintCompatiblePostCSSNode<Child>,
                index: number
              ) => false | void
            ): false | undefined;
          }
      : PostCSSNode);
