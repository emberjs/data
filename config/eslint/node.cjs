function defaults(config) {
  const result = {
    files: !config?.useModules ? ['./babel.config.js', './.eslintrc.cjs', './index.js', './addon-main.cjs', './addon-main.js'] : [],
    parserOptions: {
      sourceType: config?.useModules ? 'module' : 'script',
      ecmaVersion: 2022,
    },
    env: {
      browser: false,
      node: true,
      es6: true,
    },
    globals: config?.globals || {},
  };

  if (config?.files) {
    result.files.push(...config.files);
  }

  return result;
}

module.exports = {
  defaults
};
