// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as typescript from '@warp-drive/internal-config/eslint/typescript.js';
import * as js from '@warp-drive/internal-config/eslint/browser.js';

const AllowedImports = [
  'ember-inflector',
  '@ember/application',
  '@ember/service',
  '@ember/debug',
  '@ember/object',
  '@ember/string',
  '@ember/object/mixin',
];

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // browser (js) ================
  js.browser({
    srcDirs: ['src'],
    allowedImports: AllowedImports,
  }),

  // browser (js/ts) ================
  typescript.browser({
    files: ['**/*.ts', '**/*.gts'],
    srcDirs: ['src'],
    allowedImports: AllowedImports,
  }),

  // node (module) ================
  node.esm(),

  // node (script) ================
  node.cjs(),
];
