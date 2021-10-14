import { Linter } from 'eslint';

const linter = new Linter();

export const categories = [
	{
		type: 'problem',
		title: 'Possible Errors',
		rules: []
	},
	{
		type: 'suggestion',
		title: 'Suggestions',
		rules: []
	},
	{
		type: 'layout',
		title: 'Layout & Formatting',
		rules: []
	}
];
export const DEFAULT_RULES_CONFIG = {};

const rules = [];
for (const [ruleId, rule] of linter.getRules()) {
	if (rule.meta.deprecated) {
		continue;
	}
	const data = {
		ruleId,
		rule,
		url: rule.meta.docs.url
	};
	rules.push(data);
	const type = rule.meta.type;
	categories.find((c) => c.type === type).rules.push(data);

	if (rule.meta.docs.recommended) {
		DEFAULT_RULES_CONFIG[ruleId] = 'error';
	}
}
/** get url */
export function getURL(ruleId) {
	return linter.getRules().get(ruleId)?.meta.docs.url ?? '';
}
