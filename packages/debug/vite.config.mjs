import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  '@ember/debug/data-adapter',
  '@ember/service',
  '@ember/object/observers',
  '@ember/string',
  '@ember/array',
];

export const entryPoints = ['./src/index.ts', './src/data-adapter.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
