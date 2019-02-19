module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  plugins: [
    'prettier'
  ],
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  env: {
    browser: true
  },
  rules: {
    'no-unused-vars': ['error', {
      'args': 'none',
    }]
  },
  overrides: [
    // node files
    {
      files: [
        '.eslintrc.js',
        '.template-lintrc.js',
        'ember-cli-build.js',
        'index.js',
        'testem.js',
        'blueprints/*/index.js',
        'config/**/*.js',
        'tests/dummy/config/**/*.js'
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
        node: true
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
        WeakMap: true,
      }
    },
  ]
};
