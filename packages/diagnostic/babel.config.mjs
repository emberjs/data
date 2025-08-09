import { macros } from '@warp-drive/core/build-config/babel-macros';

export default {
  presets: [
    [
      '@babel/preset-react',
      { useBuiltIns: true, runtime: 'automatic', development: process.env.NODE_ENV !== 'production' },
    ],
  ],
  plugins: [
    ...macros(),
    [
      '@babel/plugin-transform-typescript',
      { allExtensions: true, isTSX: true, onlyRemoveTypeImports: true, allowDeclareFields: true },
    ],
  ],
};
