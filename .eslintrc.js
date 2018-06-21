module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  },
  parser: 'babel-eslint',
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',

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
  overrides: [
    // node files
    {
      files: [
        'ember-cli-build.js',
        'index.js',
        'testem.js',
        'lib/**/*.js',
        'blueprints/*/index.js',
        'blueprints/*.js',
        'config/**/*.js',
        'tests/dummy/config/**/*.js',
        'node-tests/**',
        'bin/**',
      ],
      excludedFiles: [
        'addon/**',
        'addon-test-support/**',
        'app/**',
        'tests/dummy/app/**'
      ],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2015
      },
      env: {
        browser: false,
        node: true,
        es6: true,
      },
      plugins: ['node'],
      rules: Object.assign({}, require('eslint-plugin-node').configs.recommended.rules, {
        // add your custom rules and overrides for node files here
      })
    },

    // browser files
    {
      files: [
        'addon/**',
        'app/**',
        'tests/**',
      ],
      excludedFiles: [
        'tests/dummy/config/**'
      ],
      env: {
        browser: true,
        node: false,
      },
      globals: {
        heimdall: true,
        Map: false,
      }
    },

    // browser tests
    {
      files: [
        'tests/**'
      ],

      rules: {
        'no-console': 0
      }
    },

    // node tests
    {
      files: [
        'node-tests/**'
      ],

      env: {
        mocha: true,
      }
    }
  ],
};
