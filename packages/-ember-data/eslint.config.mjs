// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as typescript from '@warp-drive/internal-config/eslint/typescript.js';
import * as qunit from '@warp-drive/internal-config/eslint/qunit.js';
import { externals } from './vite.config.mjs';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // browser (js/ts) ================
  typescript.browser({
    srcDirs: ['src'],
    allowedImports: externals,
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  }),

  // node (module) ================
  node.esm(),

  // node (script) ================
  node.cjs(),

  // Test Support ================
  qunit.ember({
    files: ['src/test-support/**/*.{js,ts}'],
    allowedImports: ['@ember/debug', '@ember/owner'],
  }),
];
