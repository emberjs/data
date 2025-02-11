import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  '@ember/object/mixin', // type only
  '@ember/debug', // assert, deprecate
];

export const entryPoints = ['./src/-private.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
