function defaults() {
  return {
    files: ['./babel.config.js', './.eslintrc.cjs', './index.js', './addon-main.cjs', './addon-main.js'],
    parserOptions: {
      sourceType: 'script',
      ecmaVersion: 2022,
    },
    env: {
      browser: false,
      node: true,
      es6: true,
    },
  };
}

module.exports = {
  defaults
};
