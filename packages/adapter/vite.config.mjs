import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  '@ember/service', // inject the store to base Adapter
  '@ember/debug', // assert, deprecate
  '@ember/object', // Adapter base, computed for headers
  '@ember/object/mixin', // BuildURLMixin
  '@ember/application', // getOwner
];
export const entryPoints = [
  './src/index.ts',
  './src/error.ts',
  './src/json-api.ts',
  './src/rest.ts',
  './src/-private.ts',
];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
