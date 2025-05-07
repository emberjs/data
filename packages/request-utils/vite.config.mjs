import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['@ember/debug', 'ember-inflector'];
export const entryPoints = ['src/index.ts', 'src/string.ts', 'src/deprecation-support.ts', 'src/handlers.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
