import assert from "assert";
import semver from "semver";
import { compile, VERSION } from "svelte/compiler";
import { parseForESLint } from "../../../src/index.js";
import { generateParserOptions } from "./test-utils.js";

const cases: Record<string, string> = {
  "top-level await in the instance script": `<script>
	const data = await Promise.resolve(1);
</script>`,
  "await in a block of the instance script": `<script>
	if (true) {
		await Promise.resolve(1);
	}
</script>`,
  "top-level await in a TypeScript instance script": `<script lang="ts">
	const data: number = await Promise.resolve(1);
</script>`,
  "await in a function": `<script>
	async function load() {
		return await Promise.resolve(1);
	}
	const arrow = async () => await Promise.resolve(1);
	const obj = { async method() { await Promise.resolve(1); } };
</script>`,
  "top-level await after a function": `<script>
	async function load() {
		return await Promise.resolve(1);
	}
	await load();
</script>`,
  "for await in the instance script": `<script>
	for await (const x of []) {
		console.log(x);
	}
</script>`,
  "top-level await in <script module>": `<script module>
	const data = await Promise.resolve(1);
</script>`,
  'top-level await in <script context="module">': `<script context="module">
	const data = await Promise.resolve(1);
</script>`,
  "top-level await in the instance script after <script module>": `<script module>
	export const a = 1;
</script>

<script>
	await Promise.resolve(a);
</script>`,
  "await in a template expression after <script module>": `<script module>
	export const p = Promise.resolve(1);
</script>

<p>{await p}</p>`,
  "await in a template expression": `<script>
	const p = Promise.resolve(1);
</script>

<p>{await p}</p>`,
  "await in an attribute": `<script>
	const p = Promise.resolve(1);
</script>

<p title={await p}></p>`,
  "await in a block expression": `<script>
	const p = Promise.resolve(1);
</script>

{#if await p}a{/if}`,
  "await in {@html}": `<script>
	const p = Promise.resolve("a");
</script>

{@html await p}`,
  "await in {@const}": `<script>
	const p = Promise.resolve(1);
</script>

{#if true}{@const x = await p}{x}{/if}`,
  "await in an event handler": `<script>
	const p = Promise.resolve(1);
</script>

<button onclick={async () => await p}>x</button>`,
  "await block": `<script>
	const p = Promise.resolve(1);
</script>

{#await p}a{:then v}{v}{/await}`,
  // These use TypeScript, because espree fails to parse them (#1027).
  "await in an {#each} body (TypeScript)": `<script lang="ts">
	const p = Promise.resolve(1);
	const items: number[] = [];
</script>

{#each items as i}{await p}{i}{/each}`,
  "await in {@const} in an {#each} body (TypeScript)": `<script lang="ts">
	const p = Promise.resolve(1);
	const items: number[] = [];
</script>

{#each items as i}{@const x = await p}{x}{i}{/each}`,
  "await in a {#snippet} body (TypeScript)": `<script lang="ts">
	const p = Promise.resolve(1);
</script>

{#snippet s()}{await p}{/snippet}`,
  "await in a {:then} body (TypeScript)": `<script lang="ts">
	const p = Promise.resolve(1);
</script>

{#await p then v}{await p}{v}{/await}`,
  "await in a {:catch} body (TypeScript)": `<script lang="ts">
	const p = Promise.resolve(1);
</script>

{#await p catch e}{await p}{e}{/await}`,
};

describe("Runes mode from top-level await", () => {
  if (!semver.gte(VERSION, "5.36.0")) {
    return;
  }
  for (const [name, code] of Object.entries(cases)) {
    it(`matches svelte/compiler: ${name}`, () => {
      const expected = compile(code, {
        experimental: { async: true },
      }).metadata.runes;
      const result = parseForESLint(
        code,
        generateParserOptions({ filePath: "test.svelte", project: null }),
      );
      assert.strictEqual(result.services.svelteParseContext.runes, expected);
    });
  }

  // The compiler throws `legacy_await_invalid` here, so only the parser is checked.
  it("keeps <svelte:options runes={false}> with a top-level await", () => {
    const code = `<svelte:options runes={false} />

<script>
	const data = await Promise.resolve(1);
</script>`;
    const result = parseForESLint(
      code,
      generateParserOptions({ filePath: "test.svelte", project: null }),
    );
    assert.strictEqual(result.services.svelteParseContext.runes, false);
  });
});
