<div class="container">
  <div class="div-class">Hello</div>

  <span class="span-class">World!</span>
</div>

<style lang="scss">
  .container {
    .div-class {
      // This is an inline comment
      color: red;
    }

    .span-class {
      font-weight: bold;
    }

    a:active,
    a::before,
    b + a,
    b + .myClass,
    a[data-key="value"] {
      color: blue;
    }
  }
</style>
