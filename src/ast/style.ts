import type { Node, Container } from "postcss";
import type { BaseNode } from "./base";

export type ESLintCompatiblePostCSSNode<PostCSSNode extends Node = Node> =
  BaseNode &
    Omit<PostCSSNode, "walk"> &
    (PostCSSNode extends Container<infer Child>
      ? {
          walk(
            callback: (
              node: ESLintCompatiblePostCSSNode<Child>,
              index: number
            ) => false | void
          ): false | undefined;
        }
      : unknown);
