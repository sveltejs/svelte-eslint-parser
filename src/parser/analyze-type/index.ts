import type { Context } from "../../context";

/**
 * Append store type declarations.
 * Append TypeScript code like
 * `declare let $foo: Parameters<Parameters<(typeof foo)["subscribe"]>[0]>[0];`
 * to define the type information for like $foo variable.
 */
export function appendDeclareStoreTypes(ctx: Context): void {
  const vcode = ctx.sourceCode.scripts.vcode;
  const extractStoreRe = /\$[\p{ID_Start}$_][\p{ID_Continue}$\u200c\u200d]*/giu;
  let m;
  const maybeStores = new Set<string>();
  while ((m = extractStoreRe.exec(vcode))) {
    const storeName = m[0];
    const originalName = storeName.slice(1);
    maybeStores.add(originalName);
  }

  ctx.scriptLet.appendDeclareMaybeStores(maybeStores);
}
