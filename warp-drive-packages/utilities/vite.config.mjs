import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['@embroider/macros'];

export const entryPoints = [
  './src/index.ts',
  './src/string.ts',
  './src/handlers.ts',
  './src/-private.ts',
  './src/json-api.ts',
  './src/active-record.ts',
  './src/rest.ts',
  './src/derivations.ts',
];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
