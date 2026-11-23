<script>
  function f() {}
</script>

{@html `<script>(${f.toString()})();</script>`}
