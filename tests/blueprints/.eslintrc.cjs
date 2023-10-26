const base = require('@warp-drive/internal-config/eslint/base.cjs');
const ignore = require('@warp-drive/internal-config/eslint/ignore.cjs');
const imports = require('@warp-drive/internal-config/eslint/imports.cjs');
const isolation = require('@warp-drive/internal-config/eslint/isolation.cjs');
const mocha = require('@warp-drive/internal-config/eslint/mocha.cjs');
const node = require('@warp-drive/internal-config/eslint/node.cjs');
const parser = require('@warp-drive/internal-config/eslint/parser.cjs');
const qunit = require('@warp-drive/internal-config/eslint/qunit.cjs');

module.exports = {
  ...parser.defaults(),

  plugins: [...base.plugins(), ...imports.plugins()],
  extends: [...base.extend()],
  rules: Object.assign(base.rules(), imports.rules(), isolation.rules(), {}),

  ignorePatterns: ignore.ignoreRules(),

  overrides: [
    node.config(),
    node.defaults(),
    qunit.defaults({
      files: ['fixtures/**/*.{js,ts}'],
      rules: {
        // Fixing these would cause test failures
        'prefer-const': 'off',
        'simple-import-sort/imports': 'off',
      },
    }),
    mocha.defaults(),
  ],
};
