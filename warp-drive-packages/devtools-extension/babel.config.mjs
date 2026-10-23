import { buildMacros } from '@embroider/macros/babel';

import { setConfig } from '@warp-drive/core/build-config';
import { macros } from '@warp-drive/core/build-config/babel-macros';

const Macros = buildMacros({
  configure: (config) => {
    setConfig(config, {});
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
