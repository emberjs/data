// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as typescript from '@warp-drive/internal-config/eslint/typescript.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // browser (ts) ================
  typescript.node({
    files: ['**/*.ts'],
    srcDirs: ['src'],
    allowedImports: [],
  }),

  // node (module) ================
  node.esm(),

  // node (script) ================
  node.cjs(),
];
