import { parse } from "svelte/compiler";
import type * as SvAST from "./svelte-ast-types";
import type { Context } from "../context";
import { convertSvelteRoot } from "./converts/index";
import { sortNodes } from "./sort";
import type {
  SvelteAttribute,
  SvelteElement,
  SvelteLiteral,
  SvelteName,
  SvelteProgram,
  SveltePugTemplateElement,
  Token,
} from "../ast";
import { ParseError } from "..";
import { parsePug } from "./pug";

/**
 * Parse for template
 */
export function parseTemplate(
  code: string,
  ctx: Context,
  parserOptions: any = {}
): {
  ast: SvelteProgram;
  svelteAst: SvAST.Ast;
} {
  try {
    const svelteAst = parse(code, {
      filename: parserOptions.filePath,
    }) as SvAST.Ast;
    const ast = convertSvelteRoot(svelteAst, ctx);

    processTemplateElement(ast, ctx);

    sortNodes(ast.body);

    return {
      ast,
      svelteAst,
    };
  } catch (e: any) {
    if (typeof e.pos === "number") {
      const err = new ParseError(e.message, e.pos, ctx);
      (err as any).svelteCompilerError = e;
      throw err;
    }
    throw e;
  }
}

/**
 * Process for `<template>`
 */
function processTemplateElement(ast: SvelteProgram, ctx: Context) {
  const templateElement = ast.body.find(
    (element): element is SvelteElement & { name: SvelteName } =>
      element.type === "SvelteElement" &&
      element.name.type === "SvelteName" &&
      element.name.name === "template"
  );
  if (templateElement) {
    const lang = templateElement.startTag.attributes.find(
      (attr): attr is SvelteAttribute & { value: [SvelteLiteral] } =>
        attr.type === "SvelteAttribute" &&
        attr.key.name === "lang" &&
        attr.value.length === 1 &&
        attr.value[0].type === "SvelteLiteral"
    );
    if (lang) {
      const range = [
        templateElement.startTag.range[1],
        templateElement.endTag
          ? templateElement.endTag.range[0]
          : templateElement.range[1],
      ] as const;
      const removedTokens: Token[] = [];
      const newTokens = ctx.tokens.filter((token) => {
        if (range[0] <= token.range[0] && token.range[1] <= range[1]) {
          removedTokens.push(token);
          return false;
        }
        return true;
      });
      if (lang.value[0].value === "pug") {
        const pugNode: SveltePugTemplateElement = templateElement as never;

        pugNode.type = "SveltePugTemplateElement";
        delete (pugNode as any).kind;
        pugNode.children = [];

        ast.body[ast.body.indexOf(templateElement)] = pugNode;
        ctx.tokens.splice(0, ctx.tokens.length, ...newTokens);
        pugNode.children = parsePug(ctx.code.slice(...range), {
          startIndex: templateElement.startTag.range[1],
          templateElement: pugNode,
          ctx,
          oldTokens: removedTokens,
        });
      }
    }
  }
}
