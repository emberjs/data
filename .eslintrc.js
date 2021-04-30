// See https://github.com/lydell/eslint-plugin-simple-import-sort#custom-grouping
const ImportSortGroups = [
  // Side effect imports.
  // eslint-disable-next-line no-useless-escape
  [`^\u0000`],
  // Glimmer & Ember Dependencies
  [`^(@ember/|@glimmer|ember$)`],
  // Packages.
  // Things that start with a letter (or digit or underscore), or `@` followed by a letter.
  // But not our packages or packages starting with ember-
  // eslint-disable-next-line no-useless-escape
  [`^(?!@ember\-data)(?!ember-)(@?\\w)`],
  // Packages starting with ember-
  // eslint-disable-next-line no-useless-escape
  [`^ember\-`],
  // Our Packages.
  // Things that start with @ember-data
  // eslint-disable-next-line no-useless-escape
  [`^@ember\-data`],
  // Absolute imports and other imports such as Vue-style `@/foo`.
  // Anything that does not start with a dot.
  ['^[^.]'],
  // Relative imports.
  // Anything that starts with a dot.
  // eslint-disable-next-line no-useless-escape
  [`^\.`],
];

module.exports = {
  parser: 'babel-eslint',
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  },
  plugins: ['prettier', 'qunit', 'mocha', 'simple-import-sort', 'import'],
  extends: ['eslint:recommended', 'prettier', 'plugin:qunit/recommended'],
  rules: {
    'no-restricted-globals': ['error', { name: 'Promise', message: 'Global Promise does not work in IE11' }],
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
    'simple-import-sort/sort': ['error', { groups: ImportSortGroups }],
    'sort-imports': 'off',
    'import/order': 'off',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    // this rule doesn't work properly with --fix
    // https://github.com/benmosher/eslint-plugin-import/issues/1504
    'import/no-duplicates': 'warn',

    // Too many false positives
    // See https://github.com/eslint/eslint/issues/11899 and similar
    'require-atomic-updates': 'off',

    'prefer-rest-params': 'off',
    'prefer-const': 'off',

    // eslint-plugin-qunit
    'qunit/assert-args': 'off',
    'qunit/literal-compare-order': 'off',
    'qunit/no-identical-names': 'off',
    'qunit/no-ok-equality': 'off',
    'qunit/no-assert-logical-expression': 'off',
    'qunit/require-expect': 'off',
    'qunit/resolve-async': 'off',
    'qunit/no-early-return': 'off',
    'qunit/no-conditional-assertions': 'off',
  },
  globals: {
    Map: false,
    WeakMap: true,
    Set: true,
    Promise: false,
  },
  env: {
    browser: true,
    node: false,
  },
  overrides: [
    // TypeScript files
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint', 'ember-data'],
      extends: ['plugin:@typescript-eslint/eslint-recommended'],
      rules: {
        'no-restricted-globals': ['off'],
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
        'no-unused-vars': 'off',
        'prefer-rest-params': 'off',
        'prefer-const': 'off',
        'ember-data/prefer-type-only-import': 'error',
      },
    },

    // node files
    {
      files: [
        '.mocharc.js',
        '.eslintrc.js',
        '.prettierrc.js',
        'bin/**',
        'packages/private-build-infra/src/**/*.js',
        'packages/unpublished-test-infra/src/**/*.js',
        'packages/unpublished-eslint-rules/src/**/*.js',
        'packages/unpublished-relationship-performance-test-app/fixtures/**/*.js',
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
      plugins: ['node', 'import'],
      extends: 'plugin:node/recommended',
      rules: {
        'simple-import-sort/sort': 'off',
        'no-restricted-globals': 'off',
        'import/first': 'error',
        'import/newline-after-import': 'error',
        'import/no-duplicates': 'error',
        'import/order': ['error', { 'newlines-between': 'always' }],
      },
    },

    // node tests
    {
      files: ['packages/*/node-tests/**', 'packages/unpublished-test-infra/src/node-test-helpers/**/*'],
      env: {
        mocha: true,
      },
      rules: {
        'no-restricted-globals': 'off',
      },
    },

    // docs
    {
      files: ['packages/-ember-data/node-tests/docs/*.js'],
      env: {
        qunit: true,
        es6: false,
      },
      rules: {
        'no-restricted-globals': 'off',
      },
    },

    // bin files
    {
      files: ['bin/**'],
      // eslint-disable-next-line node/no-unpublished-require
      rules: Object.assign({}, require('eslint-plugin-node').configs.recommended.rules, {
        'no-console': 'off',
        'no-process-exit': 'off',
        'node/no-unpublished-require': 'off',
        'node/no-unsupported-features/node-builtins': 'off',
      }),
    },
  ],
};
