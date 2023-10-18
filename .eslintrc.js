// See https://github.com/lydell/eslint-plugin-simple-import-sort#custom-grouping
const ImportSortGroups = [
  // Side effect imports.
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
  parser: '@babel/eslint-parser',
  root: true,
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    babelOptions: {
      // eslint-disable-next-line node/no-unpublished-require
      plugins: [[require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }]],
    },
    requireConfigFile: false,
  },
  plugins: ['prettier', 'qunit', 'mocha', 'simple-import-sort', 'import'],
  extends: ['eslint:recommended', 'plugin:prettier/recommended', 'plugin:qunit/recommended'],
  rules: {
    eqeqeq: 'error',

    // Imports
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'simple-import-sort/imports': ['error', { groups: ImportSortGroups }],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          '@glimmer/env',
          '@ember/object/compat',
          '@glimmer/tracking',
          '@glimmer/validator',
          '@ember/utils',
          '@ember/runloop',
        ],
      },
      // '@ember/string',
      // '@ember/object',
      // '@ember/service',
      // 'ember-inflector',
    ],
    'no-restricted-globals': [
      'error',
      {
        name: 'QUnit',
        message: 'Use or provide this.server from the test context instead',
      },
    ],

    'mocha/no-exclusive-tests': 'error',

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
    'prefer-const': 'off',

    // eslint-plugin-qunit
    'qunit/no-assert-logical-expression': 'off',
    'qunit/no-conditional-assertions': 'off',
    'qunit/no-early-return': 'off',
    'qunit/no-identical-names': 'off',
    'qunit/require-expect': 'off',
  },
  globals: {},
  env: {
    browser: true,
    node: false,
    es6: true,
  },
  overrides: [
    {
      files: [
        'tests/ember-data__json-api/**',
        'tests/ember-data__graph/**',
        'tests/ember-data__request/**',
        'tests/ember-data__adapter/**',
        'tests/ember-data__model/**',
        'tests/builders/**',
      ],
      rules: {
        'qunit/no-assert-equal': 'off',
        'qunit/no-assert-logical-expression': 'off',
        'qunit/no-conditional-assertions': 'off',
        'qunit/no-early-return': 'off',
        'qunit/no-identical-names': 'off',
        'qunit/require-expect': 'off',
      },
    },
    {
      files: ['packages/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              '@glimmer/env',
              '@ember/object/compat',
              '@glimmer/tracking',
              '@glimmer/validator',
              '@ember/utils',
              '@ember/runloop',
            ],
          },
          // '@ember/string',
          // '@ember/object',
          // '@ember/service',
          // 'ember-inflector',
        ],
      },
    },
    // TypeScript files in strict-mode
    // see https://github.com/emberjs/data/issues/6233#issuecomment-849279594
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        sourceType: 'module',
        tsConfigRootDir: __dirname,
        project: 'tsconfig.json',
      },
      plugins: ['@typescript-eslint', 'ember-data-internal'],
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
        '@typescript-eslint/prefer-includes': 'error',
        '@typescript-eslint/prefer-ts-expect-error': 'error',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-redundant-type-constituents': 'off',
        '@typescript-eslint/no-unsafe-declaration-merging': 'off',
        'ember-data-internal/prefer-static-type-import': 'error',
        'no-unused-vars': 'off',
        'prefer-const': 'off',
        'prefer-rest-params': 'off',
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'error',
        'no-loop-func': 'off',
        '@typescript-eslint/no-loop-func': 'error',
        'no-throw-literal': 'off',
        '@typescript-eslint/no-throw-literal': 'error',
        // '@typescript-eslint/prefer-readonly-parameter-types': 'error',
      },
    },
    // Typescript files in non-strict mode
    // see https://github.com/emberjs/data/issues/6233#issuecomment-849279594
    {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        sourceType: 'module',
        tsConfigRootDir: __dirname,
        project: 'tsconfig.json',
      },
      plugins: ['@typescript-eslint', 'ember-data-internal'],
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      rules: {
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-redundant-type-constituents': 'off',
        '@typescript-eslint/no-unsafe-declaration-merging': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
        'ember-data-internal/prefer-static-type-import': 'error',
        'no-unused-vars': 'off',
        'prefer-const': 'off',
        'prefer-rest-params': 'off',
        // rules we should likely activate but which currently have too many violations
        // files converted to strict must pass these rules before they can be removed from
        // the files list here and the files list in tsconfig.json
        // see https://github.com/emberjs/data/issues/6233#issuecomment-849279594
        '@typescript-eslint/no-explicit-any': 'off', // TODO activate this and use // eslint-disable-line @typescript-eslint/no-explicit-any
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/restrict-plus-operands': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/unbound-method': 'off',
      },
      files: [
        'tests/fastboot/types/global.d.ts',
        'tests/fastboot/app/serializers/application.ts',
        'tests/fastboot/app/router.ts',
        'tests/fastboot/app/resolver.ts',
        'tests/fastboot/app/config/environment.d.ts',
        'tests/fastboot/app/app.ts',
        'tests/fastboot/app/adapters/application.ts',
        '@types/require/index.d.ts',
        '@types/qunit/index.d.ts',
        '@types/fastboot/index.d.ts',
        '@types/ember/index.d.ts',
        '@types/@glimmer/tracking.d.ts',
        '@types/@ember/utils/index.d.ts',
        '@types/@ember/debug/index.d.ts',
        'ember-data-types/q/schema-definition-service.ts',
        'ember-data-types/q/record-instance.ts',
        'ember-data-types/q/record-data-store-wrapper.ts',
        'ember-data-types/q/record-data-schemas.ts',
        'ember-data-types/q/record-data-json-api.ts',
        'ember-data-types/q/promise-proxies.ts',
        'ember-data-types/q/minimum-serializer-interface.ts',
        'ember-data-types/q/minimum-adapter-interface.ts',
        'ember-data-types/q/fetch-manager.ts',
        'ember-data-types/q/ember-data-json-api.ts',
        '@types/@ember/polyfills/index.d.ts',
        'packages/json-api/src/-private/cache.ts',
        'packages/model/src/index.ts',
        'packages/model/src/-private/util.ts',
        'packages/model/src/-private/relationship-meta.ts',
        'packages/model/src/-private/legacy-relationships-support.ts',
        'packages/model/src/-private/promise-many-array.ts',
        'packages/model/src/-private/model-for-mixin.ts',
        'packages/model/src/-private/record-state.ts',
        'packages/model/src/-private/notify-changes.ts',
        'packages/adapter/types/require/index.d.ts',
        'packages/adapter/src/rest.ts',
        'packages/adapter/src/json-api.ts',
        'packages/adapter/src/index.ts',
        'packages/adapter/src/-private/utils/serialize-query-params.ts',
        'packages/adapter/src/-private/utils/fetch.ts',
        'packages/adapter/src/-private/utils/determine-body-promise.ts',
        'packages/adapter/src/-private/utils/continue-on-reject.ts',
        'packages/adapter/src/-private/fastboot-interface.ts',
        'packages/adapter/src/-private/build-url-mixin.ts',
        'packages/-ember-data/addon/store.ts',
        'tests/main/tests/integration/request-state-service-test.ts',
        'tests/main/tests/integration/record-data/store-wrapper-test.ts',
        'tests/main/tests/integration/record-data/record-data-test.ts',
        'tests/main/tests/integration/model-errors-test.ts',
        'tests/main/tests/integration/identifiers/scenarios-test.ts',
        'tests/main/tests/integration/identifiers/record-identifier-for-test.ts',
        'tests/main/tests/integration/identifiers/polymorphic-scenarios-test.ts',
        'tests/main/tests/integration/identifiers/new-records-test.ts',
        'tests/main/tests/integration/identifiers/configuration-test.ts',
        'tests/main/tests/helpers/accessors.ts',
      ],
    },

    // modern node files
    {
      files: ['tests/*/diagnostic.js'],
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2022,
      },
      env: {
        browser: false,
        node: true,
        es6: true,
      },
    },

    // node files
    {
      files: [
        '.mocharc.js',
        '.eslintrc.js',
        '.prettierrc.js',
        'scripts/**',
        'docs-generator/**',
        'tests/performance/fixtures/**/*.js',
        'tests/*/ember-cli-build.js',
        'tests/*/index.js',
        'tests/*/testem.js',
        'tests/*/.ember-cli.js',
        'tests/*/.eslintrc.js',
        'tests/*/.template-lintrc.js',
        'tests/*/config/**/*.js',
        'tests/*/tests/dummy/config/**/*.js',
        'tests/*/server/**/*.js',
        'packages/-ember-data/lib/*.js',
        'packages/private-build-infra/src/**/*.js',
        'packages/unpublished-test-infra/src/**/*.js',
        'packages/eslint-plugin-ember-data/src/**/*.js',
        'packages/unpublished-eslint-rules/src/**/*.js',
        'packages/*/babel.config.js',
        'packages/*/.ember-cli.js',
        'packages/*/.eslintrc.js',
        'packages/*/.template-lintrc.js',
        'packages/*/ember-cli-build.js',
        'packages/tracking/lib/*.js',
        'packages/*/addon-main.js',
        'packages/*/index.js',
        'packages/*/testem.js',
        'packages/*/blueprints/*/index.js',
        'packages/*/config/**/*.js',
        'packages/*/tests/dummy/config/**/*.js',
      ],
      excludedFiles: [
        'packages/*/addon/**',
        'packages/*/addon-test-support/**',
        'packages/*/app/**',
        'packages/*/tests/dummy/app/**',
      ],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2018,
      },
      env: {
        browser: false,
        node: true,
        es6: true,
      },
      plugins: ['node', 'import'],
      extends: 'plugin:node/recommended',
      rules: {
        'import/order': ['error', { 'newlines-between': 'always' }],
      },
    },

    // node tests
    {
      files: ['tests/blueprints/tests/**', 'packages/unpublished-test-infra/src/node-test-helpers/**/*'],
      env: {
        node: true,
        mocha: true,
        es6: true,
      },
      plugins: ['node', 'import'],
      extends: 'plugin:node/recommended',
      rules: {
        'import/order': ['error', { 'newlines-between': 'always' }],
        'node/no-unpublished-require': 'off',
      },
    },

    // node test fixtures
    {
      files: ['tests/blueprints/fixtures/**'],
      rules: {
        'import/order': 'off',
        'simple-import-sort/imports': 'off',
      },
    },

    // docs
    {
      files: ['tests/docs/**/*.js'],
      env: {
        node: true,
        qunit: true,
        es6: false,
      },
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2018,
      },
      rules: {
        'node/no-unpublished-require': 'off',
      },
    },

    // scripts files
    {
      files: ['scripts/**', 'docs-generator/**'],
      extends: ['plugin:node/recommended'],
      rules: {
        'no-console': 'off',
        'no-process-exit': 'off',
        'node/no-unpublished-require': 'off',
        'node/no-unsupported-features/node-builtins': 'off',
      },
    },
  ],
};
