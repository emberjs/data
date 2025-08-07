import { setConfig } from '@warp-drive/core/build-config';
import { buildMacros } from '@embroider/macros/babel';

const Macros = buildMacros({
  configure: (config) => {
    setConfig(config, {
      compatWith: '5.7',
    });
  },
});

export default {
  presets: [
    [
      '@babel/preset-react',
      { useBuiltIns: true, runtime: 'automatic', development: process.env.NODE_ENV !== 'production' },
    ],
  ],
  plugins: [
    ['module:decorator-transforms', { runtime: { import: 'decorator-transforms/runtime' } }],
    // babel-plugin-debug-macros is temporarily needed
    // to convert deprecation/warn calls into console.warn
    [
      'babel-plugin-debug-macros',
      {
        flags: [],

        debugTools: {
          isDebug: true,
          source: '@ember/debug',
          assertPredicateIndex: 1,
        },
      },
      'ember-data-specific-macros-stripping-test',
    ],
    ...Macros.babelMacros,
    [
      '@babel/plugin-transform-typescript',
      { allExtensions: true, isTSX: true, onlyRemoveTypeImports: true, allowDeclareFields: true },
    ],
  ],
};
