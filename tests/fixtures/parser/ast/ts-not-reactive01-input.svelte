<script lang="ts">
const num = 42
const obj:{ foo?: number } = {}
$: obj.foo = num
</script>
{obj.foo}
