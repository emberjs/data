// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as qunit from '@warp-drive/internal-config/eslint/qunit.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // node (module) ================
  node.esm(),

  // node (script) ================
  node.cjs({
    files: ['fixtures/**/*.{js,ts}'],
  }),

  // Test Support ================
  qunit.node({
    files: ['index.{js,ts}'],
  }),
];
