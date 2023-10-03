import * as parser from "@typescript-eslint/parser";
import * as scope from "@typescript-eslint/scope-manager";

const result = parser.parseForESLint("", { lib: ["lib", "esnext", "dom"] });
const scopeManager =
  result.scopeManager ??
  scope.analyze(result.ast as any, {
    lib: ["lib", "esnext", "dom"],
  });

export const TS_GLOBALS = scopeManager
  .globalScope!.variables.map((v) => v.name)
  .sort();
