import * as parser from "@typescript-eslint/parser";
import assert from "assert";
import * as utils from "../../../src/utils/index.js";

function parseExpression(input: string) {
  const ast = parser.parse(`async function * fn () { (${input}) }`);
  if (ast.body.length !== 1) {
    throw new Error("Expected a single expression");
  }
  const fn = ast.body[0];
  if (fn.type !== "FunctionDeclaration") {
    throw new Error("Expected an expression statement");
  }
  if (fn.body.body.length !== 1) {
    throw new Error("Expected a single expression in function body");
  }
  const body = fn.body.body[0];
  if (body.type !== "ExpressionStatement") {
    throw new Error("Expected an expression statement");
  }
  return body.expression;
}

describe("hasTypeInfo (Expression)", () => {
  it("Identifier (no type)", () => {
    const node = parseExpression("a");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });
  it("Literal", () => {
    const node = parseExpression("42");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("BinaryExpression (no type)", () => {
    const node = parseExpression("a + b");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("ArrayExpression", () => {
    const node = parseExpression("[1, 2, 3]");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("ObjectExpression", () => {
    const node = parseExpression("({a: 1})");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("FunctionExpression (untyped param)", () => {
    const node = parseExpression("function(a) { return a }");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("FunctionExpression (typed param)", () => {
    const node = parseExpression("function(a: number) { return a }");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("FunctionExpression (typed return type)", () => {
    const node = parseExpression("function(): string { return '' }");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("FunctionExpression (typed param and return type)", () => {
    const node = parseExpression("function(a: number): string { return '' }");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("FunctionExpression (default param)", () => {
    const node = parseExpression("function(a = 1) { return a }");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("FunctionExpression (rest param)", () => {
    const node = parseExpression("function(...args) { return args }");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("FunctionExpression (type parameters)", () => {
    const node = parseExpression("function<T>(a: T) { return a }");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("ArrowFunctionExpression (with typed param)", () => {
    const node = parseExpression("(a: string) => a");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("ArrowFunctionExpression (untyped param)", () => {
    const node = parseExpression("(a) => a");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("ArrowFunctionExpression (typed return type)", () => {
    const node = parseExpression("(): number => 1");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("ArrowFunctionExpression (typed param and return type)", () => {
    const node = parseExpression("(a: string): number => 1");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("ArrowFunctionExpression (default param)", () => {
    const node = parseExpression("(a = 1) => a");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("ArrowFunctionExpression (rest param)", () => {
    const node = parseExpression("(...args) => args");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("ArrowFunctionExpression (type parameters)", () => {
    const node = parseExpression("<T>(a: T) => a");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("CallExpression (no type)", () => {
    const node = parseExpression("foo(1)");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("MemberExpression (no type)", () => {
    const node = parseExpression("obj.prop");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("TemplateLiteral", () => {
    const node = parseExpression("`hello ${a}`");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("UnaryExpression", () => {
    const node = parseExpression("!a");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("UpdateExpression", () => {
    const node = parseExpression("a++");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("ConditionalExpression", () => {
    const node = parseExpression("a ? 1 : 2");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("ConditionalExpression (no type)", () => {
    const node = parseExpression("a ? x : 2");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("AssignmentExpression", () => {
    const node = parseExpression("a = 1");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("AssignmentExpression (no type at right)", () => {
    const node = parseExpression("a = x");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("SequenceExpression", () => {
    const node = parseExpression("(a, b, 1)");
    assert.strictEqual(utils.hasTypeInfo(node), true);
  });

  it("SequenceExpression (no type at last)", () => {
    const node = parseExpression("(a, 1, b)");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("NewExpression (no type)", () => {
    const node = parseExpression("new Foo(1)");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("ClassExpression (no type)", () => {
    const node = parseExpression("class A {}");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("TaggedTemplateExpression (no type)", () => {
    const node = parseExpression("tag`foo`");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("AwaitExpression (no type)", () => {
    const node = parseExpression("await a");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("YieldExpression (no type)", () => {
    const node = parseExpression("yield 1");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("ImportExpression (no type)", () => {
    const node = parseExpression("import('foo')");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });

  it("issue #746", () => {
    const node = parseExpression("e => {e; let b: number;}");
    assert.strictEqual(utils.hasTypeInfo(node), false);
  });
});
