import type { AST } from "svelte/compiler";

export type Root = AST.Root;
export type Fragment = AST.Fragment;
export type SvelteOptions = AST.SvelteOptions;
export type Script = AST.Script;

export type Text = AST.Text;

export type ExpressionTag = AST.ExpressionTag;
export type HtmlTag = AST.HtmlTag;
export type ConstTag = AST.ConstTag;
export type DebugTag = AST.DebugTag;
export type RenderTag = AST.RenderTag;

export type Component = AST.Component;
export type TitleElement = AST.TitleElement;
export type SlotElement = AST.SlotElement;
export type RegularElement = AST.RegularElement;
export type SvelteBody = AST.SvelteBody;
export type SvelteComponent = AST.SvelteComponent;
export type SvelteDocument = AST.SvelteDocument;
export type SvelteElement = AST.SvelteElement;
export type SvelteFragment = AST.SvelteFragment;
export type SvelteHead = AST.SvelteHead;
export type SvelteOptionsRaw = AST.SvelteOptionsRaw;
export type SvelteSelf = AST.SvelteSelf;
export type SvelteWindow = AST.SvelteWindow;

export type IfBlock = AST.IfBlock;
export type EachBlock = AST.EachBlock;
export type AwaitBlock = AST.AwaitBlock;
export type KeyBlock = AST.KeyBlock;
export type SnippetBlock = AST.SnippetBlock;

export type Comment = AST.Comment;
export type Attribute = AST.Attribute;
export type SpreadAttribute = AST.SpreadAttribute;
export type AnimateDirective = AST.AnimateDirective;
export type BindDirective = AST.BindDirective;
export type ClassDirective = AST.ClassDirective;
export type LetDirective = AST.LetDirective;
export type OnDirective = AST.OnDirective;
export type StyleDirective = AST.StyleDirective;
export type TransitionDirective = AST.TransitionDirective;
export type UseDirective = AST.UseDirective;

export type Tag = ExpressionTag | HtmlTag | ConstTag | DebugTag | RenderTag;
export type ElementLike =
  | Component
  | TitleElement
  | SlotElement
  | RegularElement
  | SvelteBody
  | SvelteComponent
  | SvelteDocument
  | SvelteElement
  | SvelteFragment
  | SvelteHead
  | SvelteOptionsRaw
  | SvelteSelf
  | SvelteWindow;
export type Block = EachBlock | IfBlock | AwaitBlock | KeyBlock | SnippetBlock;

export type Directive =
  | AnimateDirective
  | BindDirective
  | ClassDirective
  | LetDirective
  | OnDirective
  | StyleDirective
  | TransitionDirective
  | UseDirective;
