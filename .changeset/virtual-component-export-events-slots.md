---
"svelte-eslint-parser": minor
---

Expose component events and slots to importers, and emit the synthetic default
export as a value/type pair so it can be used both as a value and as a type. This
fixes legacy `on:` event consumers, where the parser references the component via
`import('svelte').ComponentEvents<Foo>` (using `Foo` as a *type*) — previously the
value-only `export default` made that fail with "'Foo' refers to a value, but is
being used as a type".

The export is now:

```ts
declare const $c: import('svelte').SvelteComponent<Props, Events, Slots>;
type $c = import('svelte').SvelteComponent<Props, Events, Slots>;
export { $c as default };
```

`Events`/`Slots` come from legacy `$$Events`/`$$Slots` declarations when present,
otherwise stay permissive so `on:`/slots don't get spurious errors. Props
resolution via `ComponentProps<typeof Foo>` is unchanged.

This is an experimental, alpha-stage feature implemented by Claude Code, and the
final part of the component prop/event/slot type series. It currently only takes
effect together with the experimental `ts.sys.readFile` hook
(`SVELTE_ESLINT_PARSER_EXPERIMENTAL_TS_SYS_HOOK=1`).
