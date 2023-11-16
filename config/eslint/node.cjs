function defaults(config) {
  const result = {
    files: !config?.useModules ? ['./index.js', './addon-main.cjs', './addon-main.js'] : [],
    parserOptions: {
      sourceType: config?.useModules ? 'module' : 'script',
      ecmaVersion: 2022,
      ...(config?.parserOptions ?? {}),
    },
    env: {
      browser: false,
      node: true,
      es6: true,
    },
    globals: config?.globals || {},
    plugins: ['n'],
    extends: 'plugin:n/recommended',
  };

  if (config?.files) {
    result.files.push(...config.files);
  }

  return result;
}

function config(config) {
  const result = {
    files: ['./babel.config.js', './.eslintrc.cjs', './rollup.config.mjs'],
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
    plugins: ['n'],
    extends: 'plugin:n/recommended',
    rules: {
      // It's ok to use unpublished files here since we don't ship these
      'n/no-unpublished-require': 'off',
    },
  };

  if (config?.files) {
    result.files.push(...config.files);
  }

  return result;
}

module.exports = {
  defaults,
  config,
};
