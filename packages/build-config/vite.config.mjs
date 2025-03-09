import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['fs', 'path', 'semver', 'url'];

export const entryPoints = [
  './src/index.ts',
  './src/babel-macros.ts',
  './src/env.ts',
  './src/macros.ts',
  './src/debugging.ts',
  './src/deprecations.ts',
  './src/canary-features.ts',
  './src/runtime.ts',
];

export default createConfig(
  {
    entryPoints,
    flatten: true,
    externals,
    fixModule: false,
  },
  import.meta.resolve
);
