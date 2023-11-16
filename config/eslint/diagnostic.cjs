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
        'qunit/no-conditional-assertions': 'off',
        'qunit/no-ok-equality': 'off',
      }
    ),
  };
}

module.exports = {
  defaults,
};
