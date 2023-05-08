import fs from "fs";
import path from "path";
import { ESLint } from "eslint";
import { name, version } from "../package.json";

const META_PATH = path.resolve(__dirname, "../src/meta.ts");

void main();

/** main */
async function main() {
  const eslint = new ESLint({ fix: true });
  const [result] = await eslint.lintText(
    `/*
 * IMPORTANT!
 * This file has been automatically generated,
 * in order to update its content execute "yarn build:meta"
 */
export const name = ${JSON.stringify(name)} as const;
export const version = ${JSON.stringify(version)} as const;
`,
    { filePath: META_PATH }
  );
  fs.writeFileSync(META_PATH, result.output!);
}
