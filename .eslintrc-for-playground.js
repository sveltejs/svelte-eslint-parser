"use strict"

module.exports = {
    extends: [
        require.resolve("./.eslintrc.js"),
    ],
    overrides: [
        {
            files: ["*.svelte"],
            parser: require.resolve("."),
            rules: {
                "prettier/prettier": "off"
            }
        },
    ],
}
