import fs from "fs";
import path from "path";
import { ESLint } from "eslint";
import pkg from "../package.json" with { type: "json" };
import { getNewVersion } from "./lib/changesets-util.js";
const { name, version } = pkg;

const dirname = path.dirname(new URL(import.meta.url).pathname);
const META_PATH = path.join(dirname, "../src/meta.ts");

void main();

/** main */
async function main() {
  if (!fs.existsSync(META_PATH)) {
    fs.writeFileSync(META_PATH, "", "utf8");
  }
  const eslint = new ESLint({ fix: true });
  const [result] = await eslint.lintText(
    `/*
 * IMPORTANT!
 * This file has been automatically generated,
 * in order to update its content execute "pnpm run build:meta"
 */
export const name = ${JSON.stringify(name)} as const;
export const version = ${JSON.stringify(await getVersion())} as const;
`,
    { filePath: META_PATH },
  );
  fs.writeFileSync(META_PATH, result.output!);
}

/** Get version */
function getVersion() {
  // eslint-disable-next-line no-process-env -- ignore
  if (process.env.IN_VERSION_CI_SCRIPT) {
    return getNewVersion();
  }
  return version;
}
