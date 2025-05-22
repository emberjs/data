import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [];

export const entryPoints = [
  './src/index.ts',
  './src/string.ts',
  './src/handlers.ts',
  './src/-private.ts',
  './src/json-api.ts',
];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
