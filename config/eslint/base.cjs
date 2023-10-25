const path = require('path');

function rules() {
  return {
    eqeqeq: 'error',
    'new-cap': ['error', { capIsNew: false }],
    'no-caller': 'error',
    'no-cond-assign': ['error', 'except-parens'],
    'no-console': 'error', // no longer recommended in eslint v6, this restores it
    'no-eq-null': 'error',
    'no-eval': 'error',
    'no-unused-vars': ['error', { args: 'none' }],

    // Too many false positives
    // See https://github.com/eslint/eslint/issues/11899 and similar
    'require-atomic-updates': 'off',

    'prefer-rest-params': 'off',
    'prefer-const': 'error',
  };
}

function plugins() {
  return [];
}

function extend() {
  return [
    'eslint:recommended',
    'prettier', // NOTE: must be last
  ];
}

function settings() {
  return {
    globals: {},
    env: {
      browser: true,
      node: false,
      es2022: true,
    },
  };
}

module.exports = {
  rules,
  plugins,
  extend,
  settings,
};
