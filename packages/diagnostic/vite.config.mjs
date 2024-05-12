import { keepAssets } from '@warp-drive/internal-config/rollup/keep-assets';
import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  '@ember/runloop',
  '@ember/test-helpers',
  'ember-cli-test-loader/test-support/index',
  '@glimmer/manager',
];
export const entryPoints = [
  './src/index.ts',
  './src/reporters/dom.ts',
  './src/runners/dom.ts',
  './src/ember.ts',
  './src/-types.ts',
];

export default createConfig(
  {
    entryPoints,
    externals,
    rollup: {
      plugins: [keepAssets({ from: 'src', include: ['./styles/**/*.css'] })],
    },
  },
  import.meta.resolve
);
