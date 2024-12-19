import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  'semver',
  '@ember/test-helpers',
  '@ember/version',
  '@ember/debug',
  'ember-data-qunit-asserts',
];
export const entryPoints = ['./src/test-support/**/*.ts', './src/test-support/**/*.js'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
