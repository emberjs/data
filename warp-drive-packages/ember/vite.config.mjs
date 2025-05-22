import { gjs } from '@warp-drive/internal-config/rollup/gjs.js';
import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  '@ember/template-compilation',
  '@ember/component', // unsure where this comes from
  '@ember/service',
  '@ember/owner',
  '@glimmer/component',
  '@ember/test-waiters',
  '@glimmer/tracking',
  '@glimmer/validator',
  '@ember/object/compat',
  '@ember/-internals/metal',
  '@ember/runloop',
];
export const entryPoints = ['./src/index.ts', './src/install.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
    plugins: [gjs()],
    useGlint: true,
  },
  import.meta.resolve
);
