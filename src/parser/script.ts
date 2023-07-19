import type { ESLintExtendedProgram } from ".";
import { analyzeScope } from "./analyze-scope";
import { traverseNodes } from "../traverse";
import { getParser } from "./resolve-parser";
import { isEnhancedParserObject } from "./parser-object";

/**
 * Parse for script
 */
export function parseScript(
  code: string,
  attrs: Record<string, string | undefined>,
  parserOptions: any = {},
): ESLintExtendedProgram {
  const result = parseScriptWithoutAnalyzeScopeFromVCode(
    code,
    attrs,
    parserOptions,
  );

  if (!result.scopeManager) {
    const scopeManager = analyzeScope(result.ast, parserOptions);
    result.scopeManager = scopeManager;
  }

  traverseNodes(result.ast, {
    visitorKeys: result.visitorKeys,
    enterNode(node, parent) {
      (node as any).parent = parent;

      if (node.type === "LabeledStatement" && node.label.name === "$") {
        if (parent?.type === "Program") {
          // Transform node type
          node.type = "SvelteReactiveStatement" as any;
        }
      }
    },
    leaveNode() {
      //
    },
  });

  return result;
}

/**
 * Parse for script without analyze scope
 */
export function parseScriptWithoutAnalyzeScope(
  code: string,
  attrs: Record<string, string | undefined>,
  options: any,
): ESLintExtendedProgram {
  const parser = getParser(attrs, options.parser);

  const result = isEnhancedParserObject(parser)
    ? parser.parseForESLint(code, options)
    : parser.parse(code, options);

  if ("ast" in result && result.ast != null) {
    return result;
  }
  return { ast: result } as ESLintExtendedProgram;
}

/**
 * Parse for script without analyze scope
 */
function parseScriptWithoutAnalyzeScopeFromVCode(
  code: string,
  attrs: Record<string, string | undefined>,
  options: any,
): ESLintExtendedProgram {
  const result = parseScriptWithoutAnalyzeScope(code, attrs, options);
  result._virtualScriptCode = code;
  return result;
}
