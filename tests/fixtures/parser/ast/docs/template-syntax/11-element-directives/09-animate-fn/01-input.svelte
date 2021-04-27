<script>
    const animation = (node, { from, to } , params) => ({
        delay: 42,
        duration: 42,
        easing: (t) => 42,
        css: (t, u) => 'foo :bar',
        tick: (t, u) => {}
    })
</script>
<div animate:name/>
<div animate:name={params}/>