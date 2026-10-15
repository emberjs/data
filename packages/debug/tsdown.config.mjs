import { createConfig } from '@warp-drive/internal-config/tsdown/config.js';

export const externals = [
  '@ember-data/debug/data-adapter',
  '@ember/service',
  '@ember/object/observers',
  '@ember/owner',
  '@glimmer/tracking/primitives/cache',
];

export const entryPoints = ['./src/index.ts', './src/data-adapter.ts', './src/_app_/data-adapter.js'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
