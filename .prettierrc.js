module.exports = {
  trailingComma: 'es5',
  printWidth: 120,
  overrides: [
    {
      files: '*.{js,ts,cjs,cts,mjs,mts}',
      options: {
        singleQuote: true,
      },
    },
  ],
};
