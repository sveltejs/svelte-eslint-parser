<script>
    export let containerStyles = ''
    $: containerStylesHtml = `<style>${containerStyles}</style>`;
</script>