// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as typescript from '@warp-drive/internal-config/eslint/typescript.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // browser (js/ts) ================
  typescript.browser({
    srcDirs: ['fixtures'],
    allowedImports: ['qunit'],
    rules: {
      // Fixing these would cause test failures
      'prefer-const': 'off',
      'simple-import-sort/imports': 'off',
    },
  }),

  // node (module) ================
  node.esm(),

  // node (script) ================
  node.cjs({
    files: ['tests/*'],
  }),
];
