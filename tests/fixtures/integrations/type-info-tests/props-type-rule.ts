import type { Rule } from "eslint";
import type { TSESTree } from "@typescript-eslint/types";

/**
 * A rule for tests that reports the type of `$props()`.
 * It shows whether the parser changed the type of `$props()`.
 */
export const propsTypeRule: Rule.RuleModule = {
  create(context) {
    const services = context.sourceCode.parserServices;
    return {
      CallExpression(node: TSESTree.CallExpression & Rule.Node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "$props")
          return;
        const checker = services.program.getTypeChecker();
        const type = checker.getTypeAtLocation(
          services.esTreeNodeToTSNodeMap.get(node),
        );
        context.report({
          node,
          message: `$props() type: ${checker.typeToString(type)}`,
        });
      },
    };
  },
};
