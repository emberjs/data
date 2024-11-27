import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  'ember',
  '@ember/object/computed',
  '@ember/object/promise-proxy-mixin',
  '@ember/object/proxy',
  '@ember/array/proxy',
  '@ember/application',
  '@ember/debug',
  '@ember/owner',
  '@ember/utils',
  '@ember/runloop',
  '@ember/object',
  '@ember/debug',
];

export const entryPoints = ['./src/index.ts', './src/types.ts', './src/-private.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
