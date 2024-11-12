import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  '@ember/service',
  '@ember/object',
  '@ember/application',
  '@ember/debug',
  '@ember/polyfills',
  '@ember/array',
  '@ember/object/mixin',
];
export const entryPoints = [
  './src/index.ts',
  './src/transform.ts',
  './src/json.js',
  './src/json-api.js',
  './src/rest.js',
];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
