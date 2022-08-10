import type { ESLintExtendedProgram } from ".";
import { analyzeScope } from "./analyze-scope";
import { traverseNodes } from "../traverse";
import type { ScriptsSourceCode } from "../context";
import { getParser } from "./resolve-parser";
import { isEnhancedParserObject } from "./parser-object";

/**
 * Parse for script
 */
export function parseScript(
  script: ScriptsSourceCode,
  parserOptions: any = {}
): ESLintExtendedProgram {
  const result = parseScriptWithoutAnalyzeScope(script, parserOptions);

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
function parseScriptWithoutAnalyzeScope(
  { vcode, attrs }: ScriptsSourceCode,
  options: any
): ESLintExtendedProgram {
  const parser = getParser(attrs, options.parser);

  const result = isEnhancedParserObject(parser)
    ? parser.parseForESLint(vcode, options)
    : parser.parse(vcode, options);

  if ("ast" in result && result.ast != null) {
    result._virtualScriptCode = vcode;
    return result;
  }
  return { ast: result, _virtualScriptCode: vcode } as ESLintExtendedProgram;
}
