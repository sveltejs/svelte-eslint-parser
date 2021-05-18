import { execSync } from "child_process"
import { join } from "path"
import pkg from "../package.json"
const cwd = join(__dirname, "..")

execSync("npm run build", { cwd })
execSync("npm pack", { cwd })
execSync(
    `mv svelte-eslint-parser-${pkg.version}.tgz svelte-eslint-parser.tgz`,
    { cwd },
)
