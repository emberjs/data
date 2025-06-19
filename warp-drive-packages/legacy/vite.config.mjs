import { createConfig } from '@warp-drive/internal-config/vite/config.js';

// FIXME audit this list
export const externals = [
  'ember',
  '@ember/utils',
  '@ember/service', // inject the store to base Adapter
  '@ember/debug',
  '@ember/object', // Adapter base, computed for headers
  '@ember/object/mixin', // BuildURLMixin
  '@ember/application', // getOwner
  '@ember/object/computed',
  '@ember/object/internals',
  '@ember/object/promise-proxy-mixin',
  '@ember/object/proxy',
  '@ember/array',
  '@ember/array/proxy',
  '@ember/polyfills',
];
export const entryPoints = [
  // adapter
  './src/adapter.ts',
  './src/adapter/error.js',
  './src/adapter/json-api.ts',
  './src/adapter/rest.ts',
  './src/adapter/-private.ts',

  // compat
  './src/compat.ts',
  './src/compat/builders.ts',
  './src/compat/-private.ts',
  './src/compat/utils.ts',

  // model
  './src/model.ts',
  './src/model/-private.ts',
  './src/model/migration-support.ts',

  // serializer
  './src/serializer.ts',
  './src/serializer/transform.ts',
  './src/serializer/json.js',
  './src/serializer/json-api.js',
  './src/serializer/rest.js',
];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
