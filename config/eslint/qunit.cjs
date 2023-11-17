const isolation = require('./isolation.cjs');

function defaults(config = {}) {
  return {
    files: config.files || ['tests/**/*-test.{js,ts}'],
    extends: ['plugin:qunit/recommended'],
    rules: Object.assign(
      isolation.rules({
        allowedImports: [
          '@ember/debug',
          '@ember/test-helpers',
          '@ember/test-waiters',
          'ember-qunit',
          'qunit',
          ...(config.allowedImports ?? []),
        ],
      }),
      config?.rules,
      {
        'qunit/no-assert-logical-expression': 'off',
        'qunit/no-conditional-assertions': 'off',
        'qunit/no-early-return': 'off',
        'qunit/no-ok-equality': 'off',
        'qunit/require-expect': 'off',
      }
    ),
  };
}

module.exports = {
  defaults,
};
