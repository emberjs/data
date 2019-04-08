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
        'packages/*/ember-cli-build.js',
        'packages/*/index.js',
        'packages/*/testem.js',
        'packages/*/bin/**',
        'packages/*/blueprints/*/index.js',
        'packages/*/blueprints/*.js',
        'packages/*/config/**/*.js',
        'packages/*/lib/**/*.js',
        'packages/*/node-tests/**',
        'packages/*/tests/dummy/config/**/*.js',
      ],
      excludedFiles: ['packages/*/addon/**/index.js'],
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
      // eslint-disable-next-line node/no-unpublished-require
      rules: Object.assign({}, require('eslint-plugin-node').configs.recommended.rules, {
        // add your custom rules and overrides for node files here
      }),
    },

    // node tests
    {
      files: ['packages/*/node-tests/**'],

      env: {
        mocha: true,
      },
    },
  ],
};
