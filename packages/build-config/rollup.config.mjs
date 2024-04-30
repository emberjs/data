import ts from 'rollup-plugin-ts';

import babelConfig from './babel.config.mjs';

export default {
  input: [
    './src/index.ts',
    './src/babel-macros.ts',
    './src/virtual/env.ts',
    './src/virtual/debugging.ts',
    './src/virtual/deprecations.ts',
    './src/virtual/canary-features.ts',
    './src/transforms/babel-plugin-transform-deprecations.js',
    './src/transforms/babel-plugin-transform-features.js',
    './src/transforms/babel-plugin-transform-logging.js',
  ],
  external: ['@embroider/macros/src/node.js', 'babel-import-util', 'fs', 'semver'],
  output: {
    dir: 'dist',
    format: 'es',
    // preserveModules: true,
  },
  plugins: [
    ts({
      transpiler: 'babel',
      babelConfig,
      browserslist: false,
    }),
  ],
};
