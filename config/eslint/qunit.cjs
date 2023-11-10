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
          'ember-qunit',
          'qunit',
          ...(config.allowedImports ?? []),
        ],
      }),
      config?.rules,
      {
        'qunit/no-ok-equality': 'off',
      }
    ),
  };
}

module.exports = {
  defaults,
};
