const isolation = require('./isolation.cjs');

function defaults(config = {}) {
  return {
    files: config.files || ['tests/**/*-test.{js,ts}'],
    // HACK: diagnostic API significantly overlaps with the qunit API, so we're
    // using the qunit plugin to lint diagnostic files.
    extends: ['plugin:qunit/recommended'],
    rules: Object.assign(
      isolation.rules({
        allowedImports: ['@ember/debug', '@ember/test-helpers', ...(config.allowedImports ?? [])],
      }),
      config?.rules,
      {
        'qunit/no-assert-equal': 'off',
        'qunit/no-assert-logical-expression': 'off',
        'qunit/no-conditional-assertions': 'off',
        'qunit/no-early-return': 'off',
        'qunit/no-ok-equality': 'off',
        'qunit/require-expect': 'off',
      }
    ),
  };
}

function config() {
  return {
    files: ['./diagnostic.js'],
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
    },
    env: {
      browser: false,
      node: true,
      es6: true,
    },
    plugins: ['n'],
    extends: 'plugin:n/recommended',
    rules: {
      // It's ok to use unpublished files here since we don't ship these
      'n/no-unpublished-require': 'off',
    },
  };
}

module.exports = {
  config,
  defaults,
};
