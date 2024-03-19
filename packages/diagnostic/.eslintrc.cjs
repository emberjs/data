const imports = require('@warp-drive/internal-config/eslint/imports.cjs');
const parser = require('@warp-drive/internal-config/eslint/parser.cjs');
const isolation = require('@warp-drive/internal-config/eslint/isolation.cjs');
const ignore = require('@warp-drive/internal-config/eslint/ignore.cjs');
const node = require('@warp-drive/internal-config/eslint/node.cjs');
const base = require('@warp-drive/internal-config/eslint/base.cjs');
const typescript = require('@warp-drive/internal-config/eslint/typescript.cjs');

module.exports = {
  ...parser.defaults(),

  plugins: [...base.plugins(), ...imports.plugins()],
  extends: [...base.extend()],
  rules: Object.assign(
    base.rules(),
    imports.rules(),
    isolation.rules({
      allowedImports: ['@ember/debug', '@ember/test-helpers', '@glimmer/manager', '@ember/runloop'],
    }),
    {}
  ),

  ignorePatterns: ignore.ignoreRules(),

  overrides: [
    node.config(),
    node.defaults(),
    node.defaults({
      files: ['./server/**'],
      useModules: true,
      globals: { Bun: true },
    }),
    typescript.defaults({
      rules: {
        'no-console': 'off',
      },
    }),
  ],
};
