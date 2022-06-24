<script>
const bar = { foo : "foo" };

$: ({ foo } = bar);
</script>

{foo}