<div class="a b c d">a</div>

<style>
  <!--
  .a {
    color: red;
  }
  -->
  @import "x.css";<!-- .b { color: blue; } -->
  .c::after {
    content: "<!-- -->";
  }
  /* <!-- --> */
  <!-- this text is part of a selector --> .d {
    color: green;
  }
</style>
