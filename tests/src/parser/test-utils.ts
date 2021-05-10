import path from "path"
import fs from "fs"
import type { Linter } from "eslint"
import { LinesAndColumns } from "../../../src/context"

const AST_FIXTURE_ROOT = path.resolve(__dirname, "../../fixtures/parser/ast")

export function* listupFixtures(): IterableIterator<{
    input: string
    inputFileName: string
    outputFileName: string
    getRuleOutputFileName: (ruleName: string) => string
}> {
    yield* listupFixturesImpl(AST_FIXTURE_ROOT)
}

function* listupFixturesImpl(dir: string): IterableIterator<{
    input: string
    inputFileName: string
    outputFileName: string
    getRuleOutputFileName: (ruleName: string) => string
}> {
    for (const filename of fs.readdirSync(dir)) {
        const inputFileName = path.join(dir, filename)
        if (filename.endsWith("input.svelte")) {
            const outputFileName = inputFileName.replace(
                /input\.svelte$/u,
                "output.json",
            )

            const input = fs.readFileSync(inputFileName, "utf8")
            yield {
                input,
                inputFileName,
                outputFileName,
                getRuleOutputFileName: (ruleName) => {
                    return inputFileName.replace(
                        /input\.svelte$/u,
                        `${ruleName}-result.json`,
                    )
                },
            }
        }
        if (
            fs.existsSync(inputFileName) &&
            fs.statSync(inputFileName).isDirectory()
        ) {
            yield* listupFixturesImpl(inputFileName)
        }
    }
}

export function getMessageData(
    code: string,
    message: Linter.LintMessage,
): {
    ruleId: string | null
    code: string
    message?: string
    line: number
    column: number
} {
    const linesAndColumns = new LinesAndColumns(code)
    const start = linesAndColumns.getIndexFromLoc({
        line: message.line,
        column: message.column - 1,
    })
    let end: number
    if (message.endLine != null) {
        end = linesAndColumns.getIndexFromLoc({
            line: message.endLine,
            column: message.endColumn! - 1,
        })
    } else {
        end = start + 1
    }
    if (message.ruleId == null) {
        return {
            ruleId: message.ruleId,
            message: message.message,
            code: code.slice(start, end),
            line: message.line,
            column: message.column,
        }
    }
    return {
        ruleId: message.ruleId,
        code: code.slice(start, end),
        line: message.line,
        column: message.column,
    }
}
