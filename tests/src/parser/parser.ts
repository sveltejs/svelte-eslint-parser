import assert from "assert"
import fs from "fs"

import { traverseNodes } from "../../../src/traverse"
import { parseForESLint } from "../../../src"
import { listupFixtures } from "./test-utils"
import type { Comment, SvelteProgram, Token } from "../../../src/ast"

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

function parse(code: string, filePath: string) {
    return parseForESLint(code, {
        filePath,
        parser: { ts: "@typescript-eslint/parser" },
    })
}

describe("Check for AST.", () => {
    for (const { input, inputFileName, outputFileName } of listupFixtures()) {
        describe(inputFileName, () => {
            let result: any

            it("most to generate the expected AST.", () => {
                result = parse(input, inputFileName)
                const astJson = JSON.stringify(result.ast, replacer, 2)
                const output = fs.readFileSync(outputFileName, "utf8")
                assert.strictEqual(astJson, output)
            })

            it("location must be correct.", () => {
                // check tokens
                checkTokens(result.ast, input)

                checkLoc(result.ast, inputFileName, input)
            })

            it("even if Win, it must be correct.", () => {
                const inputForWin = input.replace(/\n/g, "\r\n")
                // check
                const astForWin = parse(inputForWin, inputFileName).ast
                // check tokens
                checkTokens(astForWin, inputForWin)
            })
        })
    }
})

function checkTokens(ast: SvelteProgram, input: string) {
    const allTokens = [...ast.tokens, ...ast.comments].sort(
        (a, b) => a.range[0] - b.range[0],
    )
    // check loc
    for (const token of allTokens) {
        const value = getText(token)

        assert.strictEqual(value, input.slice(...token.range))
    }
    assert.strictEqual(
        input
            .replace(/\s/gu, "")
            .split(/(.{0,20})/)
            .filter((s) => s)
            .join("\n"),
        allTokens
            .map(getText)
            .join("")
            .replace(/\s/gu, "")
            .split(/(.{0,20})/)
            .filter((s) => s)
            .join("\n"),
    )

    function getText(token: Token | Comment) {
        return token.type === "Block"
            ? `/*${token.value}*/`
            : token.type === "Line"
            ? `//${token.value}`
            : token.value
    }
}

function checkLoc(ast: SvelteProgram, fileName: string, code: string) {
    for (const token of ast.tokens) {
        assert.ok(
            token.range[0] < token.range[1],
            `No range on "${token.type} line:${token.loc.start.line} col:${token.loc.start.column}" in ${fileName}`,
        )
    }
    for (const token of ast.comments) {
        assert.ok(
            token.range[0] < token.range[1],
            `No range on "${token.type} line:${token.loc.start.line} col:${token.loc.start.column}" in ${fileName}`,
        )
    }
    traverseNodes(ast, {
        enterNode(node, parent) {
            // assert.ok(
            //     node.parent?.type === parent?.type,
            //     `Parent type mismatch [${node.parent?.type} : ${
            //         parent?.type
            //     }] @${JSON.stringify(node, replacer)}`,
            // )
            // assert.ok(
            //     node.parent?.range?.[0] === parent?.range[0],
            //     `Parent range mismatch [${node.parent?.range?.[0]} : ${
            //         parent?.range[0]
            //     }] @${JSON.stringify(node, replacer)}`,
            // )
            // assert.ok(
            //     node.parent?.range?.[1] === parent?.range[1],
            //     `Parent range mismatch [${node.parent?.range?.[1]} : ${
            //         parent?.range[1]
            //     }] @${JSON.stringify(node, replacer)}`,
            // )
            assert.ok(
                node.range[0] < node.range[1],
                `No range on "${node.type} line:${node.loc.start.line} col:${node.loc.start.column}" in ${fileName}`,
            )

            if (parent) {
                assert.ok(
                    parent.range[0] <= node.range[0],
                    `overlap range[0] on "${parent.type} line:${parent.loc.start.line} col:${parent.loc.start.column}" > "${node.type} line:${node.loc.start.line} col:${node.loc.start.column}" in ${fileName}`,
                )
                assert.ok(
                    node.range[1] <= parent.range[1],
                    `overlap range[1] on "${parent.type} line:${parent.loc.end.line} col:${parent.loc.end.column}" > "${node.type} line:${node.loc.end.line} col:${node.loc.end.column}" in ${fileName}`,
                )

                assert.ok(
                    parent.loc.start.line <= node.loc.start.line,
                    `overlap loc.start.line on "${parent.type} line:${parent.loc.start.line} col:${parent.loc.start.column}" > "${node.type} line:${node.loc.start.line} col:${node.loc.start.column}" in ${fileName}`,
                )
                if (parent.loc.start.line === node.loc.start.line) {
                    assert.ok(
                        parent.loc.start.column <= node.loc.start.column,
                        `overlap loc.start.column on "${parent.type} line:${parent.loc.start.line} col:${parent.loc.start.column}" > "${node.type} line:${node.loc.start.line} col:${node.loc.start.column}" in ${fileName}`,
                    )
                }

                assert.ok(
                    node.loc.end.line <= parent.loc.end.line,
                    `overlap loc.end.line on "${parent.type} line:${parent.loc.end.line} col:${parent.loc.end.column}" > "${node.type} line:${node.loc.end.line} col:${node.loc.end.column}" in ${fileName}`,
                )
                if (parent.loc.end.line === node.loc.end.line) {
                    assert.ok(
                        node.loc.end.column <= parent.loc.end.column,
                        `overlap loc.end.column on "${parent.type} line:${parent.loc.end.line} col:${parent.loc.end.column}" > "${node.type} line:${node.loc.end.line} col:${node.loc.end.column}" in ${fileName}`,
                    )
                }
            }
            if (node.type === "SvelteStartTag") {
                assert.strictEqual(code[node.range[0]], "<")
                assert.strictEqual(code[node.range[1] - 1], ">")
            }
            if (node.type === "SvelteEndTag") {
                assert.strictEqual(
                    code.slice(node.range[0], node.range[0] + 2),
                    "</",
                )
                assert.strictEqual(code[node.range[1] - 1], ">")
            }
        },
        leaveNode() {
            // noop
        },
    })
}
