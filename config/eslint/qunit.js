import * as isolation from './isolation.js';
import lintQUnit from 'eslint-plugin-qunit';

const QUNIT_IMPORTS = ['@ember/test-helpers', '@ember/test-waiters', 'ember-qunit', 'qunit'];

export function rules(config = {}) {
  const ourRules = {
    'qunit/no-assert-logical-expression': 'off',
    'qunit/no-conditional-assertions': 'off',
    'qunit/no-early-return': 'off',
    'qunit/no-ok-equality': 'off',
    'qunit/require-expect': 'off',
  };

  config.allowedImports = Array.isArray(config.allowedImports)
    ? config.allowedImports.concat(QUNIT_IMPORTS)
    : QUNIT_IMPORTS.slice();

  return Object.assign({}, lintQUnit.configs.recommended.rules, isolation.rules(config), ourRules);
}

export function plugins() {
  return { qunit: lintQUnit };
}

/** @returns {import('eslint').Linter.FlatConfig} */
export function ember(config = {}) {
  config.allowedImports = Array.isArray(config.allowedImports)
    ? config.allowedImports.concat(QUNIT_IMPORTS)
    : QUNIT_IMPORTS.slice();

  return {
    files: config.files || ['tests/**/*-test.{js,ts}'],
    plugins: plugins(),
    rules: rules(config),
  };
}

/** @returns {import('eslint').Linter.FlatConfig} */
export function node(config = {}) {
  config.allowedImports = Array.isArray(config.allowedImports) ? config.allowedImports.concat(['qunit']) : ['qunit'];

  return {
    files: config.files || ['tests/**/*-test.{js,ts}'],
    plugins: plugins(),
    rules: rules(config),
  };
}
