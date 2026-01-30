import path from "path";
import { svelte2tsx } from "svelte2tsx";

/**
 * Generate .svelte.d.ts file for a Svelte component.
 * This allows TypeScript to resolve types when importing .svelte files.
 */
export function generateDts(
  svelteFilePath: string,
  content: string,
  isTsFile: boolean,
): string | null {
  try {
    const result = svelte2tsx(content, {
      filename: path.basename(svelteFilePath),
      isTsFile,
      mode: "dts",
    });

    return result.code;
  } catch {
    // Return null if generation fails
    return null;
  }
}
