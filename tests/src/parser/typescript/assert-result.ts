/** Assert equals */
export function assertResult(
  aRoot: unknown,
  bRoot: unknown,
  _info: any,
): boolean {
  const buffers = new Set([{ a: aRoot, b: bRoot, path: "$" }]);
  const pairs = new Map<unknown, unknown>();
  while (buffers.size) {
    for (const data of buffers) {
      buffers.delete(data);
      const { a, b, path } = data;

      if (a === b) {
        continue;
      }
      if (a == null || b == null) {
        throw error(
          path,
          `Not equal at ${path}: ${toDebugString(a)} !== ${toDebugString(b)}`,
        );
      }
      if (typeof a === "function" && typeof b === "function") {
        // Maybe equal
        continue;
      }
      if (typeof a !== "object" || typeof b !== "object") {
        throw error(
          path,
          `Not equal at ${path}: ${toDebugString(a)} !== ${toDebugString(b)}`,
        );
      }
      if (pairs.get(a) === b) {
        // Avoid circular reference errors.
        continue;
      }
      pairs.set(a, b);
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
          throw error(
            path,
            `Not equal array length at ${path}: ${a.length} !== ${b.length}
    ${toDebugString(a)} !== ${toDebugString(b)}`,
          );
        }
        const len = Math.max(a.length, b.length);
        for (let index = 0; index < len; index++) {
          buffers.add({ a: a[index], b: b[index], path: `${path}[${index}]` });
        }
        continue;
      }
      if (a instanceof Map && b instanceof Map) {
        const keys = new Set([...a.keys(), ...b.keys()]);
        for (const key of keys) {
          buffers.add({
            a: a.get(key),
            b: b.get(key),
            path: `${path}.${key}`,
          });
        }
        continue;
      }
      if (a instanceof Set && b instanceof Set) {
        const keys = new Set([...a.keys(), ...b.keys()]);
        for (const key of keys) {
          if (!a.has(key) || !b.has(key)) {
            throw error(
              path,
              `Not equal keys at ${path}.${key}: ${toDebugString(
                key,
              )} !== undefined`,
            );
          }
        }
        continue;
      }

      const aKeys = Object.getOwnPropertyNames(a).filter(
        (key) => !ignoreKey(key),
      );
      const bKeys = Object.getOwnPropertyNames(b).filter(
        (key) => !ignoreKey(key),
      );
      const keys = new Set([...aKeys, ...bKeys]);
      for (const key of keys) {
        let aVal = (a as any)[key];
        let bVal = (b as any)[key];
        if (key === "isWrite" || key === "isRead") {
          if (typeof aVal === "function" && typeof bVal === "function") {
            aVal = aVal.call(a);
            bVal = bVal.call(b);
          }
        }
        buffers.add({
          a: aVal,
          b: bVal,
          path: `${path}.${key}`,
        });
      }
    }
  }
  return true;

  function ignoreKey(key: string): boolean {
    return key === "$id" || key === "implicit";
  }

  function error(_path: string, message: string): Error {
    // console.log(_path, aRoot, bRoot, _info);
    throw new Error(message);
  }
}

/** Object to string */
function toDebugString(o: unknown): string {
  const circular = new Set<unknown>();
  return JSON.stringify(
    normalize(o),
    (key, value) => {
      if (
        key === "parent" ||
        key === "childScopes" ||
        key === "variables" ||
        key === "variableScope" ||
        key === "references" ||
        key === "upper" ||
        key === "through" ||
        key === "tokens" ||
        key === "node" ||
        key === "defs" ||
        key === "identifiers" ||
        key === "eslintUsed"
      ) {
        return undefined;
      }
      if (value == null || typeof value !== "object") {
        return value;
      }
      if (circular.has(value)) {
        return "[Circular]";
      }
      circular.add(value);
      return normalize(value);
    },
    2,
  );

  /** Normalize */
  function normalize(o: any) {
    if (!o) {
      return o;
    }
    if (typeof o !== "object") {
      return o;
    }
    if ("type" in o && "range" in o && "loc" in o) {
      return {
        type: o.type,
        name: o.name,
        value: o.value,
        range: o.range,
        loc: o.loc,
      };
    }
    if ("type" in o && o.type === "global") {
      return {
        type: o.type,
        block: o.block,
        childScopes: o.childScopes,
        functionExpressionScope: o.functionExpressionScope,
      };
    }
    if (o instanceof Map) {
      return Object.fromEntries(o.entries());
    }
    if (o instanceof Set) {
      return [...o];
    }
    return o;
  }
}
