import getReleasePlan from "@changesets/get-release-plan";
import path from "path";

const dirname = path.dirname(new URL(import.meta.url).pathname);

/** Get new version string from changesets */
export async function getNewVersion(): Promise<string> {
  const releasePlan = await getReleasePlan(path.resolve(dirname, "../.."));

  return releasePlan.releases.find(
    ({ name }) => name === "svelte-eslint-parser",
  )!.newVersion;
}
