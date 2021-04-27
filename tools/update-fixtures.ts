import fs from "fs"
import { Linter } from "eslint"
import * as parser from "../src/index"
import { parseForESLint } from "../src/parser"
import { getMessageData, listupFixtures } from "../tests/src/parser/test-utils"

const RULES = [
    "no-unused-labels",
    "no-extra-label",
    "no-undef",
    "no-unused-vars",
    "no-unused-expressions",
    "space-infix-ops",
]

/**
 * Remove `parent` properties from the given AST.
 */
function replacer(key: string, value: any) {
    if (key === "parent") {
        return undefined
    }
    if (value instanceof RegExp) {
        return String(value)
    }
    if (typeof value === "bigint") {
        return null // Make it null so it can be checked on node8.
        // return `${String(value)}n`
    }
    return value
}

/**
 * Parse
 */
function parse(code: string, filePath: string) {
    return parseForESLint(code, {
        filePath,
    })
}

for (const {
    input,
    inputFileName,
    outputFileName,
    getRuleOutputFileName,
} of listupFixtures()) {
    try {
        const ast = parse(input, inputFileName).ast
        const astJson = JSON.stringify(ast, replacer, 2)
        fs.writeFileSync(outputFileName, astJson, "utf8")
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
                parserOptions: {
                    ecmaVersion: 2020,
                },
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
