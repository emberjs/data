import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [];
export const entryPoints = ['./src/string.ts'];

export default createConfig(
  {
    entryPoints,
    flatten: true,
    format: 'cjs',
    externals,
    explicitExternalsOnly: true,
    babelConfigFile: import.meta
      .resolve('./babel.config-standalone.mjs')
      .slice(7)
      .replace('/node_modules/.vite-temp/', '/'),
    target: ['esnext', 'firefox121', 'node18'],
    emptyOutDir: false,
    fixModule: false,
    compileTypes: false,
  },
  import.meta.resolve
);
