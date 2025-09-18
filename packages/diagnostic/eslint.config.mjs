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
    dirname: import.meta.dirname,
    srcDirs: ['client/src'],
    allowedImports: ['@ember/test-helpers', '@glimmer/manager', '@ember/runloop'],
    rules: {
      'no-console': 'off',
    },
  }),

  typescript.node({
    dirname: import.meta.dirname,
    srcDirs: ['server/src'],
    tsconfig: 'server/tsconfig.json',
    rules: {
      'no-console': 'off',
    },
  }),

  // node (script) ================
  node.cjs(),
];
