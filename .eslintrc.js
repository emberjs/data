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
  globals: {
    'heimdall': true
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

    // from JSCS
    'array-bracket-spacing': ['error', 'never'],
    'comma-style': ['error', 'last'],
    'brace-style': ['error', '1tbs', {
      'allowSingleLine': true,
    }],
    'no-spaced-func': 'error',
    'no-empty': 'error',
    'curly': ['error', 'all'],
    'eol-last': 'error',
    'no-trailing-spaces': 'error',
    'comma-dangle': ['error', 'never'],
    'space-before-blocks': ['error', 'always'],
    'indent': ['error', 2, {
      'SwitchCase': 1,
    }],
    'keyword-spacing': ['error', {
      'overrides': {
        'else': {
          'before': true,
        },
        'while': {
          'before': true,
        },
        'catch': {
          'before': true,
        },
      },
    }],
  },
};
