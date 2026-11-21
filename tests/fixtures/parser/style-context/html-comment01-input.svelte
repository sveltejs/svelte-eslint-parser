<div class="a">a</div>

<style>
  <!-- a comment -->
  .a {
    <!-- inside block -->
    color: red;
  }
  <!-- b -->.b,
  .c<!-- c --> {
    color: blue;
  }
  .d::after {
    content: "<!-- not a comment -->";
  }
  /* <!-- inside css comment --> */
</style>
