// import { parseScript } from "../../src/parser/script"

// const result = parseScript(
//     `const a = 42;
// a++
// x++;
// for (const i of a) {

// }
// function n (arg) {
//     const b = 42
//     a++
//     y++
// }`,
//     {
//         ecmaVersion: 2020,
//         sourceType: "module",
//         loc: true,
//         range: true,
//         raw: true,
//         tokens: true,
//         comment: true,
//         eslintVisitorKeys: true,
//         eslintScopeManager: true,
//     },
// )
// const globalScope = result.scopeManager!.globalScope
// const moduleScope = globalScope.childScopes[0]
// const functionScope = moduleScope.childScopes[0]
// console.log(globalScope)
// console.log(moduleScope)
// console.log(functionScope)
// debugger
