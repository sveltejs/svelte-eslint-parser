<script lang="ts">
const num = 42 // num: 42
const obj:{ foo?: number } = {} // obj: { foo?: number | undefined; }
$: obj.foo = num // $: any, obj.foo: number | undefined, num: 42
</script>
{obj.foo} <!-- obj.foo: number | undefined -->
