import type { ESLintExtendedProgram, ESLintProgram } from ".";
import type * as tsESLintParser from "@typescript-eslint/parser";
type TSESLintParser = typeof tsESLintParser;
/**
 * The type of basic ESLint custom parser.
 * e.g. espree
 */
export type BasicParserObject = {
  parse(code: string, options: any): ESLintProgram;
  parseForESLint: undefined;
};
/**
 * The type of ESLint custom parser enhanced for ESLint.
 * e.g. @babel/eslint-parser, @typescript-eslint/parser
 */
export type EnhancedParserObject = {
  parseForESLint(code: string, options: any): ESLintExtendedProgram;
  parse: undefined;
};

/**
 * The type of ESLint (custom) parsers.
 */
export type ParserObject = EnhancedParserObject | BasicParserObject;

/** Checks whether given object is ParserObject */
export function isParserObject(value: unknown): value is ParserObject {
  return isEnhancedParserObject(value) || isBasicParserObject(value);
}
/** Checks whether given object is EnhancedParserObject */
export function isEnhancedParserObject(
  value: unknown
): value is EnhancedParserObject {
  return Boolean(value && typeof (value as any).parseForESLint === "function");
}
/** Checks whether given object is BasicParserObject */
export function isBasicParserObject(
  value: unknown
): value is BasicParserObject {
  return Boolean(value && typeof (value as any).parse === "function");
}

/** Checks whether given object maybe "@typescript-eslint/parser" */
export function maybeTSESLintParserObject(
  value: unknown
): value is TSESLintParser {
  return (
    isEnhancedParserObject(value) &&
    isBasicParserObject(value) &&
    typeof (value as any).createProgram === "function" &&
    typeof (value as any).clearCaches === "function" &&
    typeof (value as any).version === "string"
  );
}

/** Checks whether given object is "@typescript-eslint/parser" */
export function isTSESLintParserObject(
  value: unknown
): value is TSESLintParser {
  if (!isEnhancedParserObject(value)) return false;
  try {
    const result = (value as unknown as TSESLintParser).parseForESLint("", {});
    const services = result.services;
    return Boolean(
      services &&
        services.esTreeNodeToTSNodeMap &&
        services.tsNodeToESTreeNodeMap &&
        services.program
    );
  } catch {
    return false;
  }
}
