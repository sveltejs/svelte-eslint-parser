import { getEspree } from "./espree";
import type { ParserObject } from "./parser-object";
import { isParserObject } from "./parser-object";

export type UserOptionParser =
  | string
  | ParserObject
  | Record<string, string | ParserObject | undefined>
  | undefined;

/** Get parser for script lang */
export function getParserForLang(
  lang: string | undefined | null,
  parser: UserOptionParser,
): string | ParserObject {
  if (parser) {
    if (typeof parser === "string" || isParserObject(parser)) {
      return parser;
    }
    if (typeof parser === "object") {
      const value = parser[lang || "js"];
      if (typeof value === "string" || isParserObject(value)) {
        return value;
      }
    }
  }
  return "espree";
}

/** Get parser */
export function getParser(
  attrs: Record<string, string | undefined>,
  parser: UserOptionParser,
): ParserObject {
  const parserValue = getParserForLang(attrs.lang, parser);
  if (isParserObject(parserValue)) {
    return parserValue;
  }
  if (parserValue !== "espree") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- ignore
    return require(parserValue);
  }
  return getEspree();
}
