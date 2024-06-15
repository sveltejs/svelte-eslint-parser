<script>
  let foo = $state({});
  let bar = {};

  foo.bar = bar;

  console.log(foo.bar === bar); // false — `foo.bar` is a reactive proxy
  console.log($state.is(foo.bar, bar)); // true
</script>
