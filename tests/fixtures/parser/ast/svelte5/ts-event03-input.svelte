<script lang="ts">
    const {onfoo} = $props<{
        onfoo: (e: { detail: number }) => void
    }>()
    onfoo({detail: 1})
</script>

<button onclick="{e=>{
    e.currentTarget;
}}"></button>
<input oninput="{e=>{
    e.currentTarget;
}}">
