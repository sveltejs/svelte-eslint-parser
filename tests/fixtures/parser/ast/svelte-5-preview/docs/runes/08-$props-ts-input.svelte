<script lang="ts">
    type MyProps = {}
    let { a, b, c, ...everythingElse } = $props<MyProps>();
</script>
