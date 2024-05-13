// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as js from '@warp-drive/internal-config/eslint/browser.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // browser (js/ts) ================
  js.browser({
    srcDirs: ['app'],
    allowedImports: ['@ember/application', '@ember/object', '@ember/routing/route', '@ember/service'],
  }),

  // node (module) ================
  node.esm(),

  // node (script) ================
  node.cjs({
    files: ['server/**/*.js', 'fixtures/**/*.js'],
  }),
];
