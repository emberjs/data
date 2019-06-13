"use strict"

const { commonGlobals, commonRules } = require("./_commons")

module.exports = {
    globals: {
        ...commonGlobals,
        __dirname: "readonly",
        __filename: "readonly",
        exports: "readonly",
        module: "readonly",
        require: "readonly",
    },
    parserOptions: {
        ecmaFeatures: { globalReturn: true },
        ecmaVersion: 2019,
        sourceType: "script",
    },
    plugins: ["node"],
    rules: {
        ...commonRules,
        "node/no-extraneous-import": "off",
        "node/no-missing-import": "off",
        "node/no-unpublished-import": "off",
        "node/no-unsupported-features/es-syntax": ["error", { ignores: [] }],
    },
}
