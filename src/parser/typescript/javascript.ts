import type * as TS from "typescript";
import type { ESLintExtendedProgram } from "../index.js";
import type { NormalizedParserOptions } from "../parser-options.js";
import { withoutProjectParserOptions } from "../parser-options.js";
import { loadNewestModule } from "../../utils/cjs-module.js";

/**
 * TypeScript treats unknown extensions as TS, where JSDoc type annotations
 * are ignored. Use a JS source file for the virtual component instead.
 * Keep the original project intact: its source files and checker can be
 * shared by other lint calls, including calls using projectService.
 */
export function getJavaScriptParserOptions(
  result: ESLintExtendedProgram,
  attrs: Record<string, string | undefined>,
  parserOptions: NormalizedParserOptions,
): NormalizedParserOptions | null {
  if (attrs.lang && attrs.lang !== "js" && attrs.lang !== "javascript") {
    return null;
  }
  const originalProgram: TS.Program | undefined = result.services?.program;
  if (!originalProgram || !parserOptions.filePath) return null;
  const originalSource = originalProgram.getSourceFile(parserOptions.filePath);
  if (!originalSource) return null;

  const ts = loadNewestModule<typeof TS>("typescript");
  if (originalSource.flags & ts.NodeFlags.JavaScriptFile) return null;
  const source = ts.createSourceFile(
    originalSource.fileName,
    originalSource.text,
    originalSource.languageVersion,
    true,
    ts.ScriptKind.JS,
  );
  source.impliedNodeFormat = originalSource.impliedNodeFormat;
  const options = {
    ...originalProgram.getCompilerOptions(),
    allowJs: true,
    allowNonTsExtensions: true,
  };
  const host = ts.createCompilerHost(options, true);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getCurrentDirectory = () => originalProgram.getCurrentDirectory();
  host.getSourceFile = (fileName, ...args) => {
    const existing = originalProgram.getSourceFile(fileName);
    if (existing === originalSource) return source;
    return existing ?? getSourceFile(fileName, ...args);
  };
  const program = ts.createProgram({
    rootNames: originalProgram.getRootFileNames(),
    options,
    host,
    projectReferences: originalProgram.getProjectReferences(),
  });
  return {
    ...withoutProjectParserOptions(parserOptions),
    programs: [program],
  };
}
