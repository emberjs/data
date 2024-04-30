// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as typescript from '@warp-drive/internal-config/eslint/typescript.js';
import * as diagnostic from '@warp-drive/internal-config/eslint/diagnostic.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // browser (js/ts) ================
  typescript.browser({
    srcDirs: ['app', 'tests'],
    allowedImports: ['@ember/application'],
  }),

  // node (module) ================
  node.esm(),

  // node (script) ================
  node.cjs(),

  // Test Support ================
  diagnostic.browser({
    allowedImports: ['@ember/application', '@ember/owner', '@ember/service'],
  }),
];
