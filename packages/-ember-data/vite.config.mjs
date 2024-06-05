import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  '@ember/application/namespace',
  'ember',
  '@ember/debug',
  '@ember/array/proxy',
  '@ember/object/promise-proxy-mixin',
  '@ember/object/proxy',
  '@ember/application',
  '@ember/owner',
  'qunit',
  '@ember/test-waiters',
  '@ember/test-helpers',
];

export const entryPoints = ['./src/**/*.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
