<script>
let objs = [{a: 1, b: 2}, {a: 2, b: 3}]
</script>

<template lang="pug">
+each("objs as obj")
    p("{...obj}") {obj.a}
</template>