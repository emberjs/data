const base = require('@warp-drive/internal-config/eslint/base.cjs');
const ignore = require('@warp-drive/internal-config/eslint/ignore.cjs');
const imports = require('@warp-drive/internal-config/eslint/imports.cjs');
const isolation = require('@warp-drive/internal-config/eslint/isolation.cjs');
const node = require('@warp-drive/internal-config/eslint/node.cjs');
const parser = require('@warp-drive/internal-config/eslint/parser.cjs');
const qunit = require('@warp-drive/internal-config/eslint/qunit.cjs');
const typescript = require('@warp-drive/internal-config/eslint/typescript.cjs');

module.exports = {
  ...parser.defaults(),
  ...base.settings(),

  plugins: [...base.plugins(), ...imports.plugins()],
  extends: [...base.extend()],
  rules: Object.assign(
    base.rules(),
    imports.rules(),
    isolation.rules({
      allowedImports: ['@ember/application', '@ember/routing/route', '@ember/service'],
    }),
    {}
  ),

  ignorePatterns: ignore.ignoreRules(),

  overrides: [
    node.config(),
    node.defaults({
      files: ['./config/fastboot.js', './config/fastboot-testing.js'],
    }),
    typescript.defaults({
      rules: {
        // TODO: Enable these once we get types working properly
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
      },
    }),
    qunit.defaults({
      files: ['tests/**/*.{js,ts}'],
      allowedImports: ['@ember/object'],
    }),
  ],
};
