import { Addon } from '@embroider/addon-dev/rollup';
import ts from 'rollup-plugin-ts';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'dist',
});

export default {
  // This provides defaults that work well alongside `publicEntrypoints` below.
  // You can augment this if you need to.
  output: addon.output(),

  external: [],

  plugins: [
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints(['index.js', '-private.js']),

    ts({
      // can be changed to swc or other transpilers later
      // but we need the ember plugins converted first
      // (template compilation and co-location)
      transpiler: 'babel',
      browserslist: ['last 2 firefox versions', 'last 2 chrome versions', 'last 2 safari versions'],
      tsconfig: {
        fileName: '../../tsconfig.json',
        hook: (config) => ({
          ...config,
          declaration: true,
          declarationMap: true,
          // See: https://devblogs.microsoft.com/typescript/announcing-typescript-4-5/#beta-delta
          // Allows us to use `exports` to define types per export
          // However, we can't use that feature until the minimum supported TS is 4.7+
          declarationDir: './dist',
        }),
      },
    }),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
