import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [];

export const entryPoints = [
  './src/cache/**.ts',
  './src/json/**.ts',
  './src/schema/**.ts',
  './src/spec/**.ts',
  './src/cache.ts',
  './src/graph.ts',
  './src/identifier.ts',
  './src/index.ts',
  './src/params.ts',
  './src/record.ts',
  './src/request.ts',
  './src/symbols.ts',
  './src/utils.ts',
  // non-public
  './src/-private.ts',
];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
