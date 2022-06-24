<script>
const bar = [ "foo" ];

$: ([ foo = 42 ] = bar);
</script>

{foo}