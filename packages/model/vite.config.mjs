import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  'ember',
  '@ember/service',
  '@ember/debug',
  '@ember/object/computed',
  '@ember/object/internals',
  '@ember/object/promise-proxy-mixin',
  '@ember/object/proxy',
  '@ember/array',
  '@ember/array/proxy',
  '@ember/object',
  '@ember/object/mixin',
  '@ember/application',
  '@ember/polyfills',
];
export const entryPoints = ['src/index.ts', 'src/-private.ts', 'src/hooks.ts', 'src/migration-support.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
