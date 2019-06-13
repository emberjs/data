"use strict"

const { commonGlobals, commonRules } = require("./_commons")

module.exports = {
    globals: {
        ...commonGlobals,
        __dirname: "off",
        __filename: "off",
        exports: "off",
        module: "off",
        require: "off",
    },
    parserOptions: {
        ecmaFeatures: { globalReturn: false },
        ecmaVersion: 2019,
        sourceType: "module",
    },
    plugins: ["node"],
    rules: {
        ...commonRules,
        "node/no-extraneous-import": "error",
        "node/no-missing-import": "error",
        "node/no-unpublished-import": "error",
        "node/no-unsupported-features/es-syntax": [
            "error",
            { ignores: ["modules"] },
        ],
    },
}
