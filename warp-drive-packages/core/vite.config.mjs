import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['fs', 'path', 'semver', 'url'];

export const entryPoints = [
  // build-config
  './src/build-config/index.ts',
  './src/build-config/babel-macros.ts',
  './src/build-config/env.ts',
  './src/build-config/macros.ts',
  './src/build-config/debugging.ts',
  './src/build-config/deprecations.ts',
  './src/build-config/canary-features.ts',
];

export default createConfig(
  {
    entryPoints,
    flatten: false,
    externals,
    fixModule: false,
  },
  import.meta.resolve
);
