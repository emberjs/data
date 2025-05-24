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
  './src/json.ts',
  './src/json-api.ts',
  './src/rest.ts',
];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
