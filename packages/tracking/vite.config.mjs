import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  '@glimmer/validator',
  '@ember/-internals/metal',
  '@glimmer/tracking/primitives/cache',
  '@ember/object/compat',
];
export const entryPoints = ['src/index.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
