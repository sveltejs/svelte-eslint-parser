<script>
    /**
     * @typedef {object} Props
     * @property {number} value
     * @property {string} label
     */
    /** Uses @type stuff. */
    let {
        value = $bindable(),
        label = 'label',
    } = $props();
</script>

<button onclick={() => (value = 0)}>{label}</button>
