/** Compatibility for Svelte v4 <-> v5 */
import type ESTree from "estree";
import type * as SvAST from "./svelte-ast-types";
import type * as Compiler from "svelte/compiler";

export type Child =
  | Compiler.Text
  | Compiler.Tag
  | Compiler.ElementLike
  | Compiler.Block
  | Compiler.Comment;
type HasChildren = { children?: SvAST.TemplateNode[] };
// Root
export function getFragmentFromRoot(
  svelteAst: SvAST.Ast | SvAST.AstLegacy,
): SvAST.Fragment | Compiler.Fragment | undefined {
  return (
    (svelteAst as SvAST.Ast).fragment ?? (svelteAst as SvAST.AstLegacy).html
  );
}
export function getInstanceFromRoot(
  svelteAst: SvAST.Ast | SvAST.AstLegacy,
): SvAST.Script | Compiler.Script | undefined {
  return (svelteAst as SvAST.AstLegacy).instance;
}
export function getModuleFromRoot(
  svelteAst: SvAST.Ast | SvAST.AstLegacy,
): SvAST.Script | Compiler.Script | undefined {
  return (svelteAst as SvAST.AstLegacy).module;
}
export function getOptionsFromRoot(
  svelteAst: SvAST.Ast | SvAST.AstLegacy,
): Compiler.SvelteOptionsRaw | null {
  return (svelteAst as any).options?.__raw__ ?? null;
}

export function getChildren(
  fragment: Required<HasChildren> | { nodes: (Child | SvAST.TemplateNode)[] },
): (SvAST.TemplateNode | Child)[];
export function getChildren(
  fragment: HasChildren | { nodes: (Child | SvAST.TemplateNode)[] },
): (SvAST.TemplateNode | Child)[] | undefined;
export function getChildren(
  fragment: HasChildren | { nodes: (Child | SvAST.TemplateNode)[] },
): (SvAST.TemplateNode | Child)[] | undefined {
  return (
    (fragment as { nodes: (Child | SvAST.TemplateNode)[] }).nodes ??
    (fragment as HasChildren).children
  );
}
export function trimChildren(
  children: (SvAST.TemplateNode | Child)[],
): (SvAST.TemplateNode | Child)[] {
  if (
    !startsWithWhitespace(children[0]) &&
    !endsWithWhitespace(children[children.length - 1])
  ) {
    return children;
  }

  const nodes = [...children];
  while (isWhitespace(nodes[0])) {
    nodes.shift();
  }
  const first = nodes[0];
  if (startsWithWhitespace(first)) {
    nodes[0] = { ...first, data: first.data.trimStart() };
  }
  while (isWhitespace(nodes[nodes.length - 1])) {
    nodes.pop();
  }
  const last = nodes[nodes.length - 1];
  if (endsWithWhitespace(last)) {
    nodes[nodes.length - 1] = { ...last, data: last.data.trimEnd() };
  }
  return nodes;

  function startsWithWhitespace(
    child: SvAST.TemplateNode | Child | undefined,
  ): child is SvAST.Text | Compiler.Text {
    if (!child) {
      return false;
    }
    return child.type === "Text" && child.data.trimStart() !== child.data;
  }

  function endsWithWhitespace(
    child: SvAST.TemplateNode | Child | undefined,
  ): child is SvAST.Text | Compiler.Text {
    if (!child) {
      return false;
    }
    return child.type === "Text" && child.data.trimEnd() !== child.data;
  }

  function isWhitespace(child: SvAST.TemplateNode | Child | undefined) {
    if (!child) {
      return false;
    }
    return child.type === "Text" && child.data.trim() === "";
  }
}
export function getFragment(
  element:
    | {
        fragment: Compiler.Fragment;
      }
    | Required<HasChildren>,
): Compiler.Fragment | Required<HasChildren>;
export function getFragment(
  element:
    | {
        fragment: Compiler.Fragment;
      }
    | HasChildren,
): Compiler.Fragment | HasChildren;
export function getFragment(
  element:
    | {
        fragment: Compiler.Fragment;
      }
    | HasChildren,
): Compiler.Fragment | HasChildren {
  if (
    (
      element as {
        fragment: Compiler.Fragment;
      }
    ).fragment
  ) {
    return (
      element as {
        fragment: Compiler.Fragment;
      }
    ).fragment;
  }
  return element as HasChildren;
}
export function getModifiers(
  node: SvAST.Directive | SvAST.StyleDirective | Compiler.Directive,
): string[] {
  return (node as { modifiers?: string[] }).modifiers ?? [];
}
// IfBlock
export function getTestFromIfBlock(
  block: SvAST.IfBlock | Compiler.IfBlock,
): ESTree.Expression {
  return (
    (block as SvAST.IfBlock).expression ?? (block as Compiler.IfBlock).test
  );
}
export function getConsequentFromIfBlock(
  block: SvAST.IfBlock | Compiler.IfBlock,
): Compiler.Fragment | SvAST.IfBlock {
  return (block as Compiler.IfBlock).consequent ?? (block as SvAST.IfBlock);
}
export function getAlternateFromIfBlock(
  block: SvAST.IfBlock | Compiler.IfBlock,
): Compiler.Fragment | SvAST.ElseBlock | null {
  if ((block as Compiler.IfBlock).alternate) {
    return (block as Compiler.IfBlock).alternate;
  }
  return (block as SvAST.IfBlock).else ?? null;
}
// EachBlock
export function getBodyFromEachBlock(
  block: SvAST.EachBlock | Compiler.EachBlock,
): Compiler.Fragment | SvAST.EachBlock {
  if ((block as Compiler.EachBlock).body) {
    return (block as Compiler.EachBlock).body;
  }
  return block as SvAST.EachBlock;
}
export function getFallbackFromEachBlock(
  block: SvAST.EachBlock | Compiler.EachBlock,
): Compiler.Fragment | SvAST.ElseBlock | null {
  if ((block as Compiler.EachBlock).fallback) {
    return (block as Compiler.EachBlock).fallback!;
  }
  return (block as SvAST.EachBlock).else ?? null;
}
// AwaitBlock
export function getPendingFromAwaitBlock(
  block: SvAST.AwaitBlock | Compiler.AwaitBlock,
): Compiler.Fragment | SvAST.PendingBlock | null {
  const pending = block.pending;
  if (!pending) {
    return null;
  }
  if (pending.type === "Fragment") {
    return pending;
  }
  return pending.skip ? null : pending;
}
export function getThenFromAwaitBlock(
  block: SvAST.AwaitBlock | Compiler.AwaitBlock,
): Compiler.Fragment | SvAST.ThenBlock | null {
  const then = block.then;
  if (!then) {
    return null;
  }
  if (then.type === "Fragment") {
    return then;
  }
  return then.skip ? null : then;
}

export function getCatchFromAwaitBlock(
  block: SvAST.AwaitBlock | Compiler.AwaitBlock,
): Compiler.Fragment | SvAST.CatchBlock | null {
  const catchFragment = block.catch;
  if (!catchFragment) {
    return null;
  }
  if (catchFragment.type === "Fragment") {
    return catchFragment;
  }
  return catchFragment.skip ? null : catchFragment;
}
