import type { ESLintExtendedProgram } from "."
import type { ESLintCustomParser } from "./espree"
import { getEspree } from "./espree"
import { analyzeReactiveScope, analyzeScope } from "./analyze-scope"
import { traverseNodes } from "../traverse"

/**
 * Parse for script
 */
export function parseScript(
    script: {
        code: string
        attrs: Record<string, string | undefined>
    },
    parserOptions: any = {},
): ESLintExtendedProgram {
    const result = parseScriptWithoutAnalyzeScope(script, parserOptions)

    if (!result.scopeManager) {
        const scopeManager = analyzeScope(result.ast, parserOptions)
        result.scopeManager = scopeManager
    }

    traverseNodes(result.ast, {
        visitorKeys: result.visitorKeys,
        enterNode(node, parent) {
            if (
                node.type === "Identifier" &&
                node.range![0] === 61 &&
                node.name === "speed"
            )
                debugger
            ;(node as any).parent = parent

            if (node.type === "LabeledStatement" && node.label.name === "$") {
                if (parent?.type === "Program") {
                    // Transform node type
                    node.type = "SvelteReactiveStatement" as any
                }
            }
        },
        leaveNode() {
            //
        },
    })
    analyzeReactiveScope(result.scopeManager)

    return result
}

/**
 * Parse for script without analyze scope
 */
function parseScriptWithoutAnalyzeScope(
    {
        code,
        attrs,
    }: {
        code: string
        attrs: Record<string, string | undefined>
    },
    options: any,
): ESLintExtendedProgram {
    const parser: ESLintCustomParser = getParser(attrs, options.parser)

    const result =
        parser.parseForESLint?.(code, options) ?? parser.parse?.(code, options)

    if ("ast" in result && result.ast != null) {
        return result
    }
    return { ast: result } as ESLintExtendedProgram
}

/** Get parser */
function getParser(
    attrs: Record<string, string | undefined>,
    parser: any,
): ESLintCustomParser {
    if (parser) {
        if (typeof parser === "string" && parser !== "espree") {
            // eslint-disable-next-line @typescript-eslint/no-require-imports -- ignore
            return require(parser)
        } else if (typeof parser === "object") {
            const name = parser[attrs.lang || "js"]
            if (typeof name === "string") {
                return getParser(attrs, name)
            }
        }
    }
    return getEspree()
}
