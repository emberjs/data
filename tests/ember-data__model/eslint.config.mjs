// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as typescript from '@warp-drive/internal-config/eslint/typescript.js';
import * as js from '@warp-drive/internal-config/eslint/browser.js';
import * as diagnostic from '@warp-drive/internal-config/eslint/diagnostic.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // browser (js) ================
  js.browser({
    srcDirs: ['app', 'tests'],
    allowedImports: ['@ember/application'],
  }),

  // browser (js/ts) ================
  typescript.browser({
    files: ['**/*.ts', '**/*.gts'],
    srcDirs: ['app', 'tests'],
    allowedImports: ['@ember/application'],
  }),

  // node (module) ================
  node.esm(),

  // node (script) ================
  node.cjs(),

  // Test Support ================
  diagnostic.browser({
    allowedImports: ['@ember/object'],
  }),
];
