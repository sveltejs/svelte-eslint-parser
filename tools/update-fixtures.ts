import fs from "fs"
import { Linter } from "eslint"
import * as parser from "../src/index"
import { parseForESLint } from "../src/parser"
import {
    BASIC_PARSER_OPTIONS,
    getMessageData,
    listupFixtures,
    nodeReplacer,
    scopeToJSON,
} from "../tests/src/parser/test-utils"

const RULES = [
    "no-unused-labels",
    "no-extra-label",
    "no-undef",
    "no-unused-vars",
    "no-unused-expressions",
    "space-infix-ops",
    "no-setter-return",
    "no-import-assign",
    "prefer-const",
    "spaced-comment",
    "no-redeclare",
    "template-curly-spacing",
]

/**
 * Parse
 */
function parse(code: string, filePath: string) {
    return parseForESLint(code, {
        ...BASIC_PARSER_OPTIONS!,
        filePath,
    })
}

for (const {
    input,
    inputFileName,
    outputFileName,
    scopeFileName,
    getRuleOutputFileName,
} of listupFixtures()) {
    try {
        // eslint-disable-next-line no-console -- ignore
        console.log(inputFileName)
        const result = parse(input, inputFileName)
        const astJson = JSON.stringify(result.ast, nodeReplacer, 2)
        fs.writeFileSync(outputFileName, astJson, "utf8")
        const scopeJson = scopeToJSON(result.scopeManager)
        fs.writeFileSync(scopeFileName, scopeJson, "utf8")
    } catch (e) {
        // eslint-disable-next-line no-console -- ignore
        console.error(e)
        throw e
    }

    const linter = createLinter()
    for (const rule of RULES) {
        const ruleOutputFileName = getRuleOutputFileName(rule)
        const messages = linter.verify(
            input,
            {
                parser: "svelte-eslint-parser",
                parserOptions: BASIC_PARSER_OPTIONS,
                rules: {
                    [rule]: "error",
                },
                env: {
                    browser: true,
                    es2021: true,
                },
            },
            inputFileName,
        )

        if (messages.length === 0) {
            if (fs.existsSync(ruleOutputFileName))
                fs.unlinkSync(ruleOutputFileName)
        } else {
            const messagesJson = JSON.stringify(
                messages.map((m) => {
                    return getMessageData(input, m)
                }),
                null,
                2,
            )
            fs.writeFileSync(ruleOutputFileName, messagesJson, "utf8")
        }
    }
}

// eslint-disable-next-line require-jsdoc -- X
function createLinter() {
    const linter = new Linter()

    linter.defineParser("svelte-eslint-parser", parser as any)

    return linter
}
