import { keepAssets } from '@warp-drive/internal-config/vite/keep-assets';
import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  '@ember/runloop',
  '@ember/test-helpers',
  '@ember/template-compilation',
  'ember-cli-test-loader/test-support/index',
  '@glimmer/manager',
];
export const entryPoints = [
  './src/index.ts',
  './src/reporters/dom.ts',
  './src/runners/dom.ts',
  './src/helpers/install.ts',
  './src/ember.ts',
  './src/ember-classic.ts',
  './src/react.tsx',
  './src/spec.ts',
  './src/react/test-helpers.ts',
  './src/-types.ts',
];

export default createConfig(
  {
    entryPoints,
    externals,
    plugins: [keepAssets({ from: 'src', include: ['./styles/**/*.css'], dist: 'dist' })],
  },
  import.meta.resolve
);
