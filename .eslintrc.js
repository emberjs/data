module.exports = {
  parser: 'babel-eslint',
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  },
  plugins: ['prettier', 'qunit', 'mocha'],
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'mocha/no-exclusive-tests': 'error',
    'prettier/prettier': 'error',
    'no-unused-vars': ['error', { args: 'none' }],
    'no-cond-assign': ['error', 'except-parens'],
    eqeqeq: 'error',
    'no-eval': 'error',
    'new-cap': ['error', { capIsNew: false }],
    'no-caller': 'error',
    'no-eq-null': 'error',
    'no-console': 'error', // no longer recommended in eslint v6, this restores it

    // Too many false positives
    // See https://github.com/eslint/eslint/issues/11899 and similar
    'require-atomic-updates': 'off',
  },
  globals: {
    heimdall: true,
    Map: false,
    WeakMap: true,
    Set: true,
  },
  env: {
    browser: true,
    node: false,
  },
  overrides: [
    // node files
    {
      files: [
        '.mocharc.js',
        '.eslintrc.js',
        '.prettierrc.js',
        'bin/*',
        'packages/-build-infra/src/**/*.js',
        'packages/-test-infra/src/**/*.js',
        'packages/*/.ember-cli.js',
        'packages/*/.eslintrc.js',
        'packages/*/.template-lintrc.js',
        'packages/*/ember-cli-build.js',
        'packages/*/index.js',
        'packages/*/testem.js',
        'packages/*/blueprints/*/index.js',
        'packages/*/config/**/*.js',
        'packages/*/tests/dummy/config/**/*.js',
        'packages/*/node-tests/**/*.js',
      ],
      excludedFiles: [
        'packages/*/addon/**',
        'packages/*/addon-test-support/**',
        'packages/*/app/**',
        'packages/*/tests/dummy/app/**',
      ],
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
      extends: 'plugin:node/recommended',
    },

    // node tests
    {
      files: ['packages/*/node-tests/**', 'packages/-test-infra/src/node-test-helpers/**/*'],
      env: {
        mocha: true,
      },
    },

    // docs
    {
      files: ['packages/-ember-data/node-tests/docs/*.js'],
      env: {
        qunit: true,
        es6: false,
      },
    },

    // bin files
    {
      files: ['bin/*'],
      // eslint-disable-next-line node/no-unpublished-require
      rules: Object.assign({}, require('eslint-plugin-node').configs.recommended.rules, {
        'no-console': 'off',
        'no-process-exit': 'off',
        'node/no-unpublished-require': 'off',
      }),
    },
  ],
};
