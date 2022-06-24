<script>
const bar = { foo : "foo" };

$: ({ foo = 42 } = bar);
</script>

{foo}