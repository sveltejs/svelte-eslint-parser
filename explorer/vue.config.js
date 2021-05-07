module.exports = {
    publicPath: "/svelte-eslint-parser/",
    pages: {
        index: "src/main.js",
        playground: "src/main.js",
        scope: "src/main.js",
    },
    configureWebpack(_config, _isServer) {
        return {
            resolve: {
                alias: {
                    module: require.resolve("./shim/module"),
                },
            },
            module: {
                rules: [
                    {
                        test: /node_modules\/eslint-plugin-svelte3\/index\.js$/u,
                        loader: "string-replace-loader",
                        options: {
                            search: "require\\(linter_path\\)",
                            replace: (original) =>
                                `require(${JSON.stringify(
                                    require.resolve(
                                        "./shim/eslint/lib/linter/linter",
                                    ),
                                )}) // ${original}`,
                            flags: "",
                        },
                    },
                    {
                        test: /node_modules\/eslint-plugin-svelte3\/index\.js$/u,
                        loader: "string-replace-loader",
                        options: {
                            search:
                                "throw new Error\\('Could not find ESLint Linter in require cache'\\);",
                            replace: (original) => ` // ${original}`,
                            flags: "",
                        },
                    },
                ],
            },
        }
    },
}
