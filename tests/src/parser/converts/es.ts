// @ts-expect-error -- type
import espree from "espree"
import { parse as parseByCodeRed } from "code-red"
import assert from "assert"
import { convertESNode } from "../../../../src/parser/converts/es"
import { Context } from "../../../../src/context"
import type { Comment, Token } from "../../../../src/ast"
import { sort } from "../../../../src/parser/sort"

const parserOptions = {
    ecmaVersion: 2021 as const,
    sourceType: "module" as const,
    loc: true,
    range: true,
    raw: true,
    tokens: true,
    comment: true,
}

describe("tokens test", () => {
    describe("should collect the same tokens as estree.", () => {
        const tests: string[] = [
            "(123 + 456) - 789",
            "var v1 = 123",
            `const c1 = 'a' + "c"`,
            `
            // comment
            /* comment */
            /** comment */
            class A extends B {}
            `,
            "let l1 = true && false, l2, l3 = /a/g",
            `
            function a(b, c) {
                return (b + c)
            }
            function * d(e,f) {
                yield e
                yield * f
            }
            `,
            `{ /* block */ } debugger`,
            `
            while (g) {}
            do {} while (h)
            l: for (const i in j) {
                break l
            }
            for (const k of l) {
                continue
            }
            for (let index = 0; index < array.length; index++) {
                const element = array[index];
            }
            async function fn() {
                for await (variable of iterable) {
                    statement;
                }
            }
            `,
            `
            if(m) {
            } else if (n) ;
            switch (o) {
                case 1:
                    break;
                default:
            }
            `,
            `
            try {
            } catch {
            }
            try {
                throw p
            } catch (q) {
            }
            `,
            `
            function r() {
                this.s++
                ;[t,]
            }
            `,
            "const [a, b='aaaa' ] = [12, ,'']",
            "const f = () => {}",
            "const f = ({...r},...arg) => 42",
            `
            class A {
                static async st () {
                    await pppp()
                }
                async fn () {
                    await pppp()
                }
            }
            a = class extends C{}
            a = class B {}
            `,
            `a?.b?.[c]?.(a,b)`,
            "v = a ? b : c",
            `
            import a from 'a'
            import * as All from 'a'
            import {A, b as B} from 'a'
            import 'a'
            export * from 'a'
            export * as ns from 'a'
            export {
                A,
                B as B2
            }
            p = import('a')
            export const C = 42
            export default 42
            `,
            "import.meta;",
            "a  = function b () {}",
            "a  = async function b () {}",
            "(123n)",
            "(null)",
            `class A {
                get g () {}
                set g (v) {}
            }
            new A()`,
            `o = {
                a:1,
                b:2,
                c,
                get d() {},
                set e(v) {}
            }`,
            "fn(...s)",
            "v = (a,b,c)",
            `class A extends B {
                constructor () {
                    super()
                }
            }
            `,
            "T`a${b}c`",
            "`abcd`",
            "const v = typeof b",
            "delete b.c",
            "const a = -b.c",
            "c instanceof a",
            "a++;++a;a--;--a",
        ]
        for (const code of tests.reverse()) {
            it(code, () => {
                const espreeAst = espree.parse(code, parserOptions)
                // console.log(acorn)
                const acornAst = parseByCodeRed(code, {
                    ecmaVersion: parserOptions.ecmaVersion,
                    sourceType: parserOptions.sourceType,
                })
                const ctx = new Context(code, {})
                convertESNode(acornAst, null as any, ctx)

                const useRanges = sort([...ctx.tokens, ...ctx.comments]).map(
                    (t) => t.range,
                )
                let range = useRanges.shift()
                for (
                    let index = 0;
                    index < ctx.sourceCode.svelte.length;
                    index++
                ) {
                    while (range && range[1] <= index) {
                        range = useRanges.shift()
                    }
                    if (range && range[0] <= index) {
                        index = range[1] - 1
                        continue
                    }
                    const c = ctx.sourceCode.svelte[index]
                    if (!c.trim()) {
                        continue
                    }
                    ctx.addToken("Punctuator", {
                        start: index,
                        end: index + 1,
                    })
                }
                sort(ctx.comments)
                sort(ctx.tokens)

                assertTokens(code, ctx, espreeAst)
            })
        }
    })
})

function assertTokens(
    _code: string,
    ctx: Context,
    { tokens, comments }: { tokens: Token[]; comments: Comment[] },
) {
    assert.deepStrictEqual(
        normalize(ctx.tokens),
        normalize(
            (tokens as any).map(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit
                ({ start, end, ...o }: { start: number; end: number }) => o,
            ),
        ),
    )
    assert.deepStrictEqual(
        normalize(ctx.comments),
        normalize(
            (comments as any).map(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit
                ({ start, end, ...o }: { start: number; end: number }) => o,
            ),
        ),
    )

    function normalize(o: any) {
        return JSON.parse(JSON.stringify(o))
    }
}
