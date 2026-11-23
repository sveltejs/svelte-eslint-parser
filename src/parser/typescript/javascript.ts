import { createRequire } from "node:module";
import path from "node:path";
import type * as TS from "typescript";
import type { ESLintExtendedProgram } from "../index.js";
import type { NormalizedParserOptions } from "../parser-options.js";
import { withoutProjectParserOptions } from "../parser-options.js";
import { loadNewestModule } from "../../utils/cjs-module.js";

const TYPESCRIPT_FILE = `${path.sep}lib${path.sep}typescript.js`;
const typeScriptBySourceFileClass = new WeakMap<object, typeof TS>();

/**
 * Find the copy of TypeScript that created `sourceFile`. A project can reach
 * several copies, and the newest one may not be the one typescript-eslint
 * uses. For example, TypeScript 7 has no JS API. Each copy has its own
 * source file class, so compare it with the copies in `require.cache`.
 */
function getTypeScript(sourceFile: TS.SourceFile): typeof TS {
  const sourceFileClass = sourceFile.constructor;
  let ts = typeScriptBySourceFileClass.get(sourceFileClass);
  if (ts) return ts;
  const cache = createRequire(import.meta.url).cache ?? {};
  for (const [filePath, cached] of Object.entries(cache)) {
    if (!filePath.endsWith(TYPESCRIPT_FILE)) continue;
    const candidate: typeof TS | undefined = cached?.exports;
    if (
      typeof candidate?.createSourceFile === "function" &&
      candidate.createSourceFile("", "", candidate.ScriptTarget.Latest)
        .constructor === sourceFileClass
    ) {
      ts = candidate;
      break;
    }
  }
  ts ??= loadNewestModule<typeof TS>("typescript");
  typeScriptBySourceFileClass.set(sourceFileClass, ts);
  return ts;
}

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

  const ts = getTypeScript(originalSource);
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
