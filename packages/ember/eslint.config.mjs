// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as typescript from '@warp-drive/internal-config/eslint/typescript.js';
import * as gts from '@warp-drive/internal-config/eslint/gts.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // browser (js/ts) ================
  typescript.browser({
    srcDirs: ['src'],
    allowedImports: ['@ember/service', '@glimmer/tracking', '@glimmer/component', '@ember/owner'],
  }),

  // gts
  gts.browser({
    srcDirs: ['src'],
    allowedImports: ['@ember/service', '@glimmer/tracking', '@glimmer/component', '@ember/owner'],
  }),

  // node (module) ================
  node.esm(),

  // node (script) ================
  node.cjs(),
];
