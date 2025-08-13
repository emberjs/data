import { setConfig } from '@warp-drive/core/build-config';
import { buildMacros } from '@embroider/macros/babel';
import { macros } from '@warp-drive/core/build-config/babel-macros';

const Macros = buildMacros({
  configure: (config) => {
    setConfig(config, {
      compatWith: process.env.EMBER_DATA_FULL_COMPAT ? '99.0' : null,
      deprecations: {
        DEPRECATE_TRACKING_PACKAGE: false,
      },
    });
  },
});

export default {
  plugins: [
    ['module:decorator-transforms', { runtime: { import: 'decorator-transforms/runtime' } }],
    [
      '@babel/plugin-transform-typescript',
      {
        allExtensions: true,
        allowDeclareFields: true,
        onlyRemoveTypeImports: true,
      },
    ],
    [
      'babel-plugin-ember-template-compilation',
      {
        transforms: [...Macros.templateMacros],
      },
    ],
    ...macros(),
    ...Macros.babelMacros,
  ],

  generatorOpts: {
    compact: false,
  },
};
