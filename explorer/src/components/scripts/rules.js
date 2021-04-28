import Linter from "eslint4b"

const linter = new Linter()

export const categories = [
    {
        title: "Possible Errors",
        rules: [],
    },
    {
        title: "Best Practices",
        rules: [],
    },
    {
        title: "Strict Mode",
        rules: [],
    },
    {
        title: "Variables",
        rules: [],
    },
    {
        title: "Stylistic Issues",
        rules: [],
    },
    {
        title: "ECMAScript 6",
        rules: [],
    },
]
export const DEFAULT_RULES_CONFIG = {}

const rules = []
for (const [ruleId, rule] of linter.getRules()) {
    if (rule.meta.deprecated) {
        continue
    }
    const data = {
        ruleId,
        rule,
        url: rule.meta.docs.url,
    }
    rules.push(data)
    const category = rule.meta.docs.category
    categories.find((c) => c.title === category).rules.push(data)

    if (rule.meta.docs.recommended) {
        DEFAULT_RULES_CONFIG[ruleId] = "error"
    }
}
/** get url */
export function getURL(ruleId) {
    return linter.getRules().get(ruleId)?.meta.docs.url
}
