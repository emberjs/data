function defaults() {
  return {
    parser: '@babel/eslint-parser',
    root: true,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      babelOptions: {
        // eslint-disable-next-line n/no-unpublished-require
        plugins: [[require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }]],
      },
      requireConfigFile: false,
    },
  };
}

module.exports = {
  defaults,
};
