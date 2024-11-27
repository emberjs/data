import * as isolation from './isolation.js';
import * as qunit from './qunit.js';

const QUNIT_BANNED_IMPORTS = ['ember-qunit', 'qunit', 'ember-exam'];

/** @returns {import('eslint').Linter.FlatConfig} */
export function browser(config = {}) {
  const base = qunit.ember(config);
  base.rules = Object.assign(
    base.rules,
    {
      'qunit/no-assert-equal': 'off',
    },
    isolation.rules({
      allowedImports: ['@ember/test-helpers', '@ember/test-waiters', ...(config.allowedImports ?? [])].filter(
        (v) => !QUNIT_BANNED_IMPORTS.includes(v)
      ),
    }),
    config.rules ?? {}
  );

  return base;
}
