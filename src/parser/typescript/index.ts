import type { ESLintExtendedProgram } from "..";
import { parseScript } from "../script";
import { analyzeScript } from "./analyze";
import type { TSESParseForESLintResult } from "./types";

/**
 * Parse for type script
 */
export function parseTypeScript(
  code: { script: string; render: string },
  attrs: Record<string, string | undefined>,
  parserOptions: any = {}
): ESLintExtendedProgram {
  const tsCtx = analyzeScript(code, attrs, parserOptions);

  const result = parseScript(tsCtx.script, attrs, parserOptions);

  tsCtx.restoreContext.restore(result as unknown as TSESParseForESLintResult);

  // // Debug
  // assertEq(
  //   parseScript(code.script + code.render, attrs, parserOptions).ast,
  //   result.ast
  // );
  // assertEq(
  //   parseScript(code.script + code.render, attrs, parserOptions).scopeManager,
  //   result.scopeManager!
  // );

  return result;
}

// /* eslint-disable complexity -- debug */
// /** Assert equals */
// function assertEq(
//   /* eslint-enable complexity -- debug */
//   aRoot: unknown,
//   bRoot: unknown
// ): boolean {
//   const buffers = new Set([{ a: aRoot, b: bRoot, path: "$" }]);
//   const pairs = new Map<unknown, unknown>();
//   while (buffers.size) {
//     for (const data of buffers) {
//       buffers.delete(data);
//       const { a, b, path } = data;

//       if (a === b) {
//         continue;
//       }
//       if (a == null || b == null) {
//         console.log(path, aRoot, bRoot);
//         debugger;
//         throw new Error(
//           `Not equal at ${path}: ${toDebugString(a)} !== ${toDebugString(b)}`
//         );
//       }
//       if (typeof a === "function" && typeof b === "function") {
//         // Maybe equal
//         continue;
//       }
//       if (typeof a !== "object" || typeof b !== "object") {
//         console.log(path, aRoot, bRoot);
//         debugger;
//         throw new Error(
//           `Not equal at ${path}: ${toDebugString(a)} !== ${toDebugString(b)}`
//         );
//       }
//       if (pairs.get(a) === b) {
//         // Avoid circular reference errors.
//         continue;
//       }
//       pairs.set(a, b);
//       if (Array.isArray(a) && Array.isArray(b)) {
//         if (a.length !== b.length) {
//           console.log(path, aRoot, bRoot);
//           debugger;
//           throw new Error(
//             `Not equal array length at ${path}: ${a.length} !== ${b.length}
// ${toDebugString(a)} !== ${toDebugString(b)}`
//           );
//         }
//         const len = Math.max(a.length, b.length);
//         for (let index = 0; index < len; index++) {
//           buffers.add({ a: a[index], b: b[index], path: `${path}[${index}]` });
//         }
//         continue;
//       }
//       if (a instanceof Map && b instanceof Map) {
//         if (a.size !== b.size) {
//           console.log(path, aRoot, bRoot);
//           debugger;
//           throw new Error(`Not equal Map size at ${path}`);
//         }
//         const keys = new Set([...a.keys(), ...b.keys()]);
//         for (const key of keys) {
//           buffers.add({
//             a: a.get(key),
//             b: b.get(key),
//             path: `${path}.${key}`,
//           });
//         }
//         continue;
//       }
//       if (a instanceof Set && b instanceof Set) {
//         if (a.size !== b.size) {
//           console.log(path, aRoot, bRoot);
//           debugger;
//           throw new Error(
//             `Not equal Set size at ${path}: ${a.size} !== ${b.size}`
//           );
//         }
//         for (const key of a.keys()) {
//           if (!b.has(key)) {
//             console.log(path, aRoot, bRoot);
//             debugger;
//             throw new Error(
//               `Not equal keys at ${path}.${key}: ${toDebugString(
//                 key
//               )} !== undefined`
//             );
//           }
//         }
//         continue;
//       }

//       const aKeys = Object.getOwnPropertyNames(a).filter(
//         (key) => !ignoreKey(key)
//       );
//       const bKeys = Object.getOwnPropertyNames(b).filter(
//         (key) => !ignoreKey(key)
//       );
//       if (aKeys.length !== bKeys.length) {
//         console.log(path, aRoot, bRoot);
//         debugger;
//         throw new Error(
//           `Not equal object keys length at ${path}: ${aKeys.length} !== ${
//             bKeys.length
//           }
// ${toDebugString(a)} !== ${toDebugString(b)}`
//         );
//       }
//       const keys = new Set([...aKeys, ...bKeys]);
//       for (const key of keys) {
//         let aVal = (a as any)[key];
//         let bVal = (b as any)[key];
//         if (key === "isWrite" || key === "isRead") {
//           if (typeof aVal === "function" && typeof bVal === "function") {
//             aVal = aVal.call(a);
//             bVal = bVal.call(b);
//           }
//         }
//         buffers.add({
//           a: aVal,
//           b: bVal,
//           path: `${path}.${key}`,
//         });
//       }
//     }
//   }
//   return true;

//   // eslint-disable-next-line require-jsdoc -- ignore
//   function ignoreKey(key: string): boolean {
//     return (
//       key === "parent" ||
//       key === "$id" ||
//       // key === "variableScope" ||
//       key === "implicit"
//     );
//   }
// }

// /** Object to string */
// function toDebugString(o: unknown): string {
//   const circular = new Set<unknown>();
//   return JSON.stringify(
//     normalize(o),
//     /* eslint-disable complexity -- debug */
//     (
//       /* eslint-enable complexity -- debug */
//       key,
//       value
//     ) => {
//       if (
//         key === "parent" ||
//         key === "childScopes" ||
//         key === "variables" ||
//         key === "variableScope" ||
//         key === "variableScope" ||
//         key === "references" ||
//         key === "upper" ||
//         key === "through" ||
//         key === "tokens" ||
//         key === "node" ||
//         key === "defs" ||
//         key === "identifiers" ||
//         key === "eslintUsed"
//       ) {
//         return undefined;
//       }
//       if (value == null || typeof value !== "object") {
//         return value;
//       }
//       if (circular.has(value)) {
//         return "[Circular]";
//       }
//       circular.add(value);
//       return normalize(value);
//     },
//     2
//   );

//   /** Normalize */
//   function normalize(o: any) {
//     if (!o) {
//       return o;
//     }
//     if ("type" in o && "range" in o && "loc" in o) {
//       return {
//         type: o.type,
//         name: o.name,
//         value: o.value,
//         range: o.range,
//         loc: o.loc,
//       };
//     }
//     if ("type" in o && o.type === "global") {
//       return {
//         type: o.type,
//         block: o.block,
//         childScopes: o.childScopes,
//         functionExpressionScope: o.functionExpressionScope,
//       };
//     }
//     if (o instanceof Map) {
//       return Object.fromEntries(o.entries());
//     }
//     if (o instanceof Set) {
//       return [...o];
//     }
//     return o;
//   }
// }
