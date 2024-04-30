import { macros } from '@warp-drive/build-config/babel-macros';

export default {
  plugins: [
    ...macros(),
    ['@babel/plugin-transform-runtime', { loose: true }],
    [
      '@babel/plugin-transform-typescript',
      { allExtensions: true, onlyRemoveTypeImports: true, allowDeclareFields: true },
    ],
    '@embroider/addon-dev/template-colocation-plugin',
    [
      'babel-plugin-ember-template-compilation',
      {
        targetFormat: 'hbs',
        transforms: [],
      },
    ],
    ['module:decorator-transforms', { runtime: { import: 'decorator-transforms/runtime' } }],
  ],
};
