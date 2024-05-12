import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  'ember-inflector', // pluralize
];

export const entryPoints = ['./src/index.ts', './src/request.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
