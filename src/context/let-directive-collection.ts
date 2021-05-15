import type { SvelteLetDirective } from "../ast"
import type * as ESTree from "estree"
import type { ScriptLetCallback, ScriptLetCallbackOption } from "./script-let"

/** A class that collects pattern nodes for Let directives. */
export class LetDirectiveCollection {
    private readonly list: {
        pattern: ESTree.Pattern
        directive: SvelteLetDirective
        typing: string
        callbacks: ScriptLetCallback<ESTree.Pattern>[]
    }[] = []

    public isEmpty(): boolean {
        return this.list.length === 0
    }

    public getLetParams(): ESTree.Pattern[] {
        return this.list.map((d) => d.pattern)
    }

    public getCallback(): (
        nodes: ESTree.Pattern[],
        options: ScriptLetCallbackOption,
    ) => void {
        return (nodes, options) => {
            for (let index = 0; index < nodes.length; index++) {
                const node = nodes[index]
                for (const callback of this.list[index].callbacks) {
                    callback(node, options)
                }
            }
        }
    }

    public getTypes(): string[] {
        return this.list.map((d) => d.typing)
    }

    public addPattern(
        pattern: ESTree.Pattern,
        directive: SvelteLetDirective,
        typing: string,
        ...callbacks: ScriptLetCallback<ESTree.Pattern>[]
    ): ScriptLetCallback<ESTree.Pattern>[] {
        this.list.push({
            pattern,
            directive,
            typing,
            callbacks,
        })
        return callbacks
    }
}
export class LetDirectiveCollections {
    private readonly stack: LetDirectiveCollection[] = []

    public beginExtract(): void {
        this.stack.push(new LetDirectiveCollection())
    }

    public getCollection(): LetDirectiveCollection {
        return this.stack[this.stack.length - 1]
    }

    public extract(): LetDirectiveCollection {
        return this.stack.pop()!
    }
}
