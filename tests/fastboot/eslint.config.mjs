// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as typescript from '@warp-drive/internal-config/eslint/typescript.js';
import * as js from '@warp-drive/internal-config/eslint/browser.js';
import * as qunit from '@warp-drive/internal-config/eslint/qunit.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // browser (js) ================
  js.browser({
    srcDirs: ['app', 'tests'],
    allowedImports: ['@ember/routing/route', '@ember/application', '@ember/service'],
  }),

  // browser (js/ts) ================
  typescript.browser({
    dirname: import.meta.dirname,
    files: ['**/*.ts', '**/*.gts'],
    srcDirs: ['app', 'tests'],
    allowedImports: ['@ember/routing/route', '@ember/application', '@ember/service'],
    rules: {
      // TODO: Enable these once we get types working properly
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  }),

  // node (module) ================
  node.esm(),

  // node (script) ================
  node.cjs({
    files: ['config/fastboot.js', 'config/fastboot-testing.js'],
  }),

  // Test Support ================
  qunit.ember({
    allowedImports: ['@ember/object'],
  }),
];
