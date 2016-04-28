/* global module */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
  extends: 'eslint:recommended',
  env: {
    'browser': true,
  },
  rules: {
    'no-unused-vars': ['error', {
      'args': 'none',
    }],

    // from JSHint
    'no-cond-assign': ['error', 'except-parens'],
    'eqeqeq': 'error',
    'no-eval': 'error',
    'new-cap': ['error', {
      'capIsNew': false,
    }],
    'no-caller': 'error',
    'no-irregular-whitespace': 'error',
    'no-undef': 'error',
    'no-eq-null': 'error',
  },
};
