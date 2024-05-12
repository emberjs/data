// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as typescript from '@warp-drive/internal-config/eslint/typescript.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // node (ts) ================
  typescript.node({
    srcDirs: ['src', 'bin', 'utils'],
    allowedImports: [],
    rules: { '@typescript-eslint/switch-exhaustiveness-check': 'error' },
  }),

  // node (module) ================
  node.esm(),
];
