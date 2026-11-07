<script lang="ts">
  import { customAction } from "./action.js";

  const items = new Set<string>();
</script>

<p use:customAction={items}>hello world</p>
