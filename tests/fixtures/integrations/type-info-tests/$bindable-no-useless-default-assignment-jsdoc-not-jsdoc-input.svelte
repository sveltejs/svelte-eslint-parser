<script>
    /**
     * @typedef {object} Props
     * @property {number} value
     * @property {string} label
     */
    /* @type {Props} */
    let {
        value = $bindable(),
        label = 'label',
    } = $props();
</script>

<button onclick={() => (value = 0)}>{label}</button>
