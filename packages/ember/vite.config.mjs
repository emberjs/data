import { gjs } from '@warp-drive/internal-config/rollup/gjs';
import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  '@ember/template-compilation',
  '@ember/component', // unsure where this comes from
  '@ember/service',
  '@glimmer/component',
  '@ember/test-waiters',
  '@glimmer/tracking',
];
export const entryPoints = ['./src/index.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
    plugins: [gjs()],
    useGlint: true,
  },
  import.meta.resolve
);
