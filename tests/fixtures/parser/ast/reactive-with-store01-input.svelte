<script>
import { writable } from "svelte/store";

const bar = {
	foo : writable(0),
};

$: ({ foo } = bar);

$: baz = $foo;
</script>

{baz}
