module.exports = {
  parser: 'babel-eslint',
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  },
  plugins: ['prettier'],
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'prettier/prettier': 'error',

    'no-unused-vars': [
      'error',
      {
        args: 'none',
      },
    ],

    'no-cond-assign': ['error', 'except-parens'],
    eqeqeq: 'error',
    'no-eval': 'error',
    'new-cap': [
      'error',
      {
        capIsNew: false,
      },
    ],
    'no-caller': 'error',
    'no-irregular-whitespace': 'error',
    'no-undef': 'error',
    'no-eq-null': 'error',
  },
  globals: {
    heimdall: true,
    Map: false,
    WeakMap: true,
  },
  env: {
    browser: true,
    node: false,
  },
  overrides: [
    // node files
    {
      files: [
        '.eslintrc.js',
        '.prettierrc.js',
        'ember-cli-build.js',
        'index.js',
        'testem.js',
        'bin/**',
        'blueprints/*/index.js',
        'blueprints/*.js',
        'config/**/*.js',
        'lib/**/*.js',
        'node-tests/**',
        'tests/dummy/config/**/*.js',
      ],
      excludedFiles: ['addon/**/index.js'],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2015,
      },
      env: {
        browser: false,
        node: true,
        es6: true,
      },
      plugins: ['node'],
      rules: Object.assign({}, require('eslint-plugin-node').configs.recommended.rules, {
        // add your custom rules and overrides for node files here
      }),
    },

    // node tests
    {
      files: ['node-tests/**'],

      env: {
        mocha: true,
      },
    },
  ],
};
