<script lang="ts">
  const { child, optional } = $props();
</script>

{#snippet foo(value: number)}{value}{/snippet}

{@render /* before */ foo(1)}
{@render foo(1) /* after */}
{@render foo(1) // line
}
{@render (foo)(1) /* parenthesized callee */}
{@render optional?.() /* optional */}
{@render child() /* a */ /* b */}
