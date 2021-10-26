import Module from "module"
import path from "path"
import type { ESLintCustomParser } from "./resolve-parser"

const createRequire: (filename: string) => (modName: string) => any =
    // Added in v12.2.0
    Module.createRequire ||
    // Added in v10.12.0, but deprecated in v12.2.0.
    // @ts-expect-error -- old type
    Module.createRequireFromPath ||
    // Polyfill - This is not executed on the tests on node@>=10.
    /* istanbul ignore next */
    ((modName) => {
        const mod = new Module(modName)

        mod.filename = modName
        mod.paths = (Module as any)._nodeModulePaths(path.dirname(modName))
        ;(mod as any)._compile("module.exports = require;", modName)
        return mod.exports
    })

let espreeCache: ESLintCustomParser | null = null

/** Checks if given path is linter path */
function isLinterPath(p: string): boolean {
    return (
        // ESLint 6 and above
        p.includes(
            `eslint${path.sep}lib${path.sep}linter${path.sep}linter.js`,
        ) ||
        // ESLint 5
        p.includes(`eslint${path.sep}lib${path.sep}linter.js`)
    )
}

/**
 * Load `espree` from the loaded ESLint.
 * If the loaded ESLint was not found, just returns `require("espree")`.
 */
export function getEspree(): ESLintCustomParser {
    if (!espreeCache) {
        // Lookup the loaded eslint
        const linterPath = Object.keys(require.cache || {}).find(isLinterPath)
        if (linterPath) {
            try {
                espreeCache = createRequire(linterPath)("espree")
            } catch {
                // ignore
            }
        }
        if (!espreeCache) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports -- ignore
            espreeCache = require("espree")
        }
    }

    return espreeCache!
}
