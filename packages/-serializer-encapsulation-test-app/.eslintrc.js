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
        '.template-lintrc.js',
        'ember-cli-build.js',
        'testem.js',
        'blueprints/*/index.js',
        'config/**/*.js',
        'lib/*/index.js',
        'server/**/*.js',
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
  ],
};
