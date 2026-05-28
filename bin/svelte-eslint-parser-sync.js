#!/usr/bin/env node
// @ts-check
import path from "node:path";
import process from "node:process";
import { syncVirtualCode } from "../lib/index.js";

/**
 * Usage:
 *   svelte-eslint-parser-sync [cwd] [--project <tsconfig>]
 *
 * Pre-generates the virtual code cache so concurrent ESLint workers can read
 * it without scanning or writing. Pair with
 * `parserOptions.svelteFeatures.experimentalVirtualCodeMode = "prepared"`.
 */

/** @type {{ cwd?: string; project?: string; parser?: string }} */
const options = {};
const positional = [];
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--project" || arg === "-p") {
    options.project = args[++i];
  } else if (arg === "--parser") {
    options.parser = args[++i];
  } else if (arg === "--help" || arg === "-h") {
    process.stdout.write(
      "Usage: svelte-eslint-parser-sync [cwd] [--project <tsconfig>] [--parser <name>]\n",
    );
    process.exit(0);
  } else {
    positional.push(arg);
  }
}

if (positional[0]) {
  options.cwd = path.resolve(positional[0]);
}

const start = Date.now();
const result = syncVirtualCode(options);
const elapsedMs = Date.now() - start;

if (!result.projectRoot) {
  process.stderr.write(
    "svelte-eslint-parser-sync: could not find project root (package.json)\n",
  );
  process.exit(1);
}

process.stdout.write(
  `svelte-eslint-parser-sync: cache ready at ${result.cacheDir} (${elapsedMs}ms)\n`,
);
