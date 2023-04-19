import type { ChildNode, Container, Node, Root } from "postcss";
import type { Locations } from "./common";
import type { SvelteStyleElement } from "./html";

type ESLintCompatiblePostCSSContainer<Child extends Node> = Omit<
  Container<ESLintCompatiblePostCSSNode<Child>>,
  "parent" | "type" | "walk"
> & {
  walk(
    callback: (
      node: ESLintCompatiblePostCSSNode<ChildNode>,
      index: number
    ) => false | void
  ): false | undefined;
};

export type ESLintCompatiblePostCSSNode<PostCSSNode extends Node> =
  // The following hack makes the `type` property work for type narrowing, see microsoft/TypeScript#53887.
  PostCSSNode extends any
    ? Locations &
        Omit<PostCSSNode, "parent" | "type" | "walk"> & {
          type: `SvelteStyle-${PostCSSNode["type"]}`;
        } & (PostCSSNode extends Container<infer Child>
          ? ESLintCompatiblePostCSSContainer<Child>
          : unknown) &
        (PostCSSNode extends Root
          ? {
              parent: SvelteStyleElement;
            }
          : {
              parent: PostCSSNode["parent"];
            })
    : never;
