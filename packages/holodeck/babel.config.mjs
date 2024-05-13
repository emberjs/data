export default {
  plugins: [
    [
      '@babel/plugin-transform-typescript',
      { allExtensions: true, onlyRemoveTypeImports: true, allowDeclareFields: true },
    ],
  ],
};
