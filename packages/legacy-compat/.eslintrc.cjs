const imports = require('@warp-drive/internal-config/eslint/imports.cjs');
const parser = require('@warp-drive/internal-config/eslint/parser.cjs');
const isolation = require('@warp-drive/internal-config/eslint/isolation.cjs');
const ignore = require('@warp-drive/internal-config/eslint/ignore.cjs');
const node = require('@warp-drive/internal-config/eslint/node.cjs');
const base = require('@warp-drive/internal-config/eslint/base.cjs');
const typescript = require('@warp-drive/internal-config/eslint/typescript.cjs');

const config = {
  ...parser.defaults(),
  ...base.settings(),

  plugins: [...base.plugins(), ...imports.plugins()],
  extends: [...base.extend()],
  rules: Object.assign(
    base.rules(),
    imports.rules(),
    isolation.rules({
      allowedImports: ['@ember/debug', '@ember/string', '@ember/application'],
    }),
    {}
  ),

  ignorePatterns: ignore.ignoreRules(),

  overrides: [node.config(), node.defaults(), typescript.defaults()],
};

module.exports = config;
