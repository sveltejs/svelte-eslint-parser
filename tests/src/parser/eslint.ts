import { Linter } from "eslint"
import assert from "assert"
import * as parser from "../../../src/index"
import { BASIC_PARSER_OPTIONS } from "./test-utils"

function createLinter() {
    const linter = new Linter()

    linter.defineParser("svelte-eslint-parser", parser as any)

    return linter
}

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("eslint custom parser", () => {
    it("should work with eslint.", () => {
        const code = `<h1>Hello!</h1>`

        const linter = createLinter()
        linter.defineRule("test", {
            create(context) {
                return {
                    SvelteElement(node: any) {
                        context.report({
                            node,
                            message: "test",
                        })
                    },
                }
            },
        })
        const messages = linter.verify(code, {
            parser: "svelte-eslint-parser",
            rules: {
                test: "error",
            },
        })

        assert.strictEqual(messages.length, 1)
        assert.strictEqual(messages[0].message, "test")
    })

    describe("should work with eslint core rule.", () => {
        const tests: {
            code: string
            output: string | null
            messages: {
                ruleId: string
                line: number
                column: number
            }[]
            parserOptions?: any
        }[] = [
            {
                code: `
                <script>
                let a=1;
                let b=2;
                let c=3;
                </script>
                <input type="number" bind:value={a}>
                <input type="number" bind:value={b}>
                <p>{a}+{b}={a+b}</p>
                `,
                output: `
                <script>
                let a = 1;
                let b = 2;
                let c = 3;
                </script>
                <input type="number" bind:value={a}>
                <input type="number" bind:value={b}>
                <p>{a}+{b}={a + b}</p>
                `,
                messages: [
                    {
                        ruleId: "no-unused-vars",
                        line: 5,
                        column: 21,
                    },
                ],
            },
            {
                code: `
                <script>
                let count = 0;
                $: doubled = count * 2;
                function handleClick() {
                    count += 1;
                }
                </script>
                <button on:click={handleClick}>
                    Clicked {count} {count === 1 ? 'time' : 'times'}
                </button>
                <p>{count} doubled is {doubled}</p>
                `,
                output: null,
                messages: [],
            },
            {
                code: `
                <script>
                let count = 0;
                function handleClick() {
                    count += 1;
                }
                $: console.log(\`the count is \${count}\`);
                $: {
                    console.log(\`the count is \${count}\`);
                    alert(\`I SAID THE COUNT IS \${count}\`);
                }
                $: if (count >= 10) {
                    alert(\`count is dangerously high!\`);
                    count = 9;
                }
                </script>
                <button on:click={handleClick}>
                    Clicked {count} {count === 1 ? 'time' : 'times'}
                </button>
                `,
                output: null,
                messages: [],
            },
            {
                code: `
                <script>
                import Thing from './Thing.svelte';
                let things = [
                    { id: 1, color: 'darkblue' },
                    { id: 2, color: 'indigo' },
                    { id: 3, color: 'deeppink' },
                    { id: 4, color: 'salmon' },
                    { id: 5, color: 'gold' }
                ];
                function handleClick() {
                    things = things.slice(1);
                }
                </script>
                <button on:click={handleClick}>
                    Remove first thing
                </button>
                {#each things as thing (thing.id)}
                    <Thing current={thing.color}/>
                {/each}
                `,
                output: null,
                messages: [],
            },
            {
                code: `
                <script>
                </script>
                <MyComponent
                    on:click={handleClick}
                    attr="a{b}c"
                >
                    Remove first thing {a}
                </MyComponent>
                {#each things as thing (thing.id)}
                    <Thing
                      current={thing.color}/>
                {/each}
                `,
                output: null,
                messages: [
                    {
                        ruleId: "no-undef",
                        line: 4,
                        column: 18,
                    },
                    {
                        ruleId: "no-undef",
                        line: 5,
                        column: 31,
                    },
                    {
                        ruleId: "no-undef",
                        line: 6,
                        column: 29,
                    },
                    {
                        ruleId: "no-undef",
                        line: 8,
                        column: 41,
                    },
                    {
                        ruleId: "no-undef",
                        line: 10,
                        column: 24,
                    },
                    {
                        ruleId: "no-undef",
                        line: 11,
                        column: 22,
                    },
                ],
            },
            {
                code: `
                <script>
                    let value = \`Some words are *italic*, some are **bold**\`;
                </script>
                <textarea bind:value></textarea>
                `,
                output: null,
                messages: [],
            },
            {
                code: `
                <script>
                import { count } from './stores.js';
                </script>
                <h1>The count is {$count}</h1>
                `,
                output: null,
                messages: [],
            },
            {
                // test for ecmaVersion latest
                code: `
                <script>
                import { count } from './stores.js';
                </script>
                <h1>The count is {$count}</h1>
                `,
                output: null,
                parserOptions: { ecmaVersion: "latest" },
                messages: [],
            },
        ]

        for (const { code, output, messages, parserOptions } of tests) {
            it(code, () => {
                const linter = createLinter()
                const result = linter.verifyAndFix(code, {
                    parser: "svelte-eslint-parser",
                    parserOptions: {
                        ...BASIC_PARSER_OPTIONS,
                        ...(parserOptions ? parserOptions : {}),
                    },
                    rules: {
                        "no-unused-labels": "error",
                        "no-extra-label": "error",
                        "no-undef": "error",
                        "no-unused-vars": "error",
                        "no-unused-expressions": "error",
                        "space-infix-ops": "error",
                    },
                    env: {
                        browser: true,
                        es2021: true,
                    },
                })

                assert.deepStrictEqual(
                    result.messages.map((m) => {
                        return {
                            ruleId: m.ruleId,
                            line: m.line,
                            column: m.column,
                        }
                    }),
                    messages,
                )

                assert.strictEqual(result.output, output ?? code)
            })
        }
    })
})
