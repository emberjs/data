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
    ecmaVersion: 2018,
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
      plugins: ['@typescript-eslint', 'ember-data'],
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
        'ember-data/prefer-static-type-import': 'error',
        'no-unused-vars': 'off',
        'prefer-const': 'off',
        'prefer-rest-params': 'off',
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
      plugins: ['@typescript-eslint', 'ember-data'],
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      rules: {
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
        'ember-data/prefer-static-type-import': 'error',
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
        'packages/unpublished-test-infra/addon-test-support/qunit-asserts/utils/is-thenable.ts',
        'packages/unpublished-test-infra/addon-test-support/qunit-asserts/index.ts',
        'packages/unpublished-test-infra/addon-test-support/qunit-asserts/check-matcher.ts',
        'packages/unpublished-test-infra/addon-test-support/qunit-asserts/assert-warning.ts',
        'packages/unpublished-test-infra/addon-test-support/qunit-asserts/assert-deprecation.ts',
        'packages/unpublished-test-infra/addon-test-support/qunit-asserts/assert-assertion.ts',
        'tests/fastboot/types/global.d.ts',
        'tests/fastboot/types/fastboot-test-app/index.d.ts',
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
        '@types/@ember/runloop/index.d.ts',
        '@types/@ember/runloop/-private/backburner.d.ts',
        '@types/@ember/object/compat.d.ts',
        '@types/@ember/debug/index.d.ts',
        'packages/store/src/index.ts',
        'packages/store/src/-private/utils/promise-record.ts',
        'packages/store/src/-private/utils/is-non-empty-string.ts',
        'packages/store/src/-private/utils/construct-resource.ts',
        'ember-data-types/q/utils.ts',
        'ember-data-types/q/schema-definition-service.ts',
        'ember-data-types/q/record-instance.ts',
        'ember-data-types/q/record-data-store-wrapper.ts',
        'ember-data-types/q/record-data-schemas.ts',
        'ember-data-types/q/record-data-json-api.ts',
        'ember-data-types/q/promise-proxies.ts',
        'ember-data-types/q/minimum-serializer-interface.ts',
        'ember-data-types/q/minimum-adapter-interface.ts',
        'ember-data-types/q/identifier.ts',
        'ember-data-types/q/fetch-manager.ts',
        'ember-data-types/q/ember-data-json-api.ts',
        'ember-data-types/q/ds-model.ts',
        'packages/store/src/-private/managers/record-data-store-wrapper.ts',
        'packages/store/src/-private/network/snapshot.ts',
        'packages/store/src/-private/network/snapshot-record-array.ts',
        'packages/store/src/-private/legacy-model-support/schema-definition-service.ts',
        'packages/store/src/-private/network/request-cache.ts',
        'packages/store/src/-private/legacy-model-support/record-reference.ts',
        'packages/store/src/-private/managers/record-notification-manager.ts',
        'packages/store/src/-private/caches/record-data-for.ts',
        'packages/store/src/-private/utils/normalize-model-name.ts',
        'packages/store/src/-private/legacy-model-support/shim-model-class.ts',
        'packages/store/src/-private/network/fetch-manager.ts',
        'packages/store/src/-private/store-service.ts',
        'packages/store/src/-private/utils/coerce-id.ts',
        'packages/store/src/-private/index.ts',
        'packages/store/src/-private/caches/identifier-cache.ts',
        'packages/serializer/src/index.ts',
        '@types/@ember/runloop/index.d.ts',
        '@types/@ember/polyfills/index.d.ts',
        'tests/graph/tests/integration/graph/polymorphism/implicit-keys-test.ts',
        'tests/graph/tests/integration/graph/graph-test.ts',
        'tests/graph/tests/integration/graph/operations-test.ts',
        'tests/graph/tests/integration/graph/edge-test.ts',
        'tests/graph/tests/integration/graph/edge-removal/setup.ts',
        'tests/graph/tests/integration/graph/edge-removal/helpers.ts',
        'tests/graph/tests/integration/graph/edge-removal/abstract-edge-removal-test.ts',
        'tests/graph/tests/integration/graph.ts',
        'packages/graph/src/-private/relationships/state/has-many.ts',
        'packages/graph/src/-private/relationships/state/belongs-to.ts',
        'packages/graph/src/-private/normalize-link.ts',
        'packages/graph/src/-private/graph/operations/update-relationship.ts',
        'packages/graph/src/-private/graph/operations/replace-related-records.ts',
        'packages/graph/src/-private/graph/operations/replace-related-record.ts',
        'packages/graph/src/-private/graph/operations/remove-from-related-records.ts',
        'packages/graph/src/-private/graph/operations/add-to-related-records.ts',
        'packages/graph/src/-private/graph/index.ts',
        'packages/graph/src/-private/graph/-utils.ts',
        'packages/graph/src/-private/graph/-state.ts',
        'packages/graph/src/-private/graph/-operations.ts',
        'packages/graph/src/-private/graph/-edge-definition.ts',
        'packages/graph/src/-private/coerce-id.ts',
        'packages/json-api/src/-private/cache.ts',
        'packages/private-build-infra/addon/index.ts',
        'packages/private-build-infra/addon/deprecations.ts',
        'packages/private-build-infra/addon/current-deprecations.ts',
        'packages/private-build-infra/addon/available-packages.ts',
        'packages/model/src/index.ts',
        'packages/model/src/-private/util.ts',
        'packages/model/src/-private/relationship-meta.ts',
        'packages/model/src/-private/legacy-relationships-support.ts',
        'packages/model/src/-private/promise-many-array.ts',
        'packages/model/src/-private/model-for-mixin.ts',
        'packages/model/src/-private/record-state.ts',
        'packages/model/src/-private/notify-changes.ts',
        'packages/canary-features/addon/index.ts',
        'packages/canary-features/addon/default-features.ts',
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
        'tests/main/tests/unit/custom-class-support/custom-class-model-test.ts',
        'tests/main/tests/integration/request-state-service-test.ts',
        'tests/main/tests/integration/record-data/store-wrapper-test.ts',
        'tests/main/tests/integration/record-data/record-data-test.ts',
        'tests/main/tests/integration/record-data/record-data-state-test.ts',
        'tests/main/tests/integration/record-data/record-data-errors-test.ts',
        'tests/main/tests/integration/model-errors-test.ts',
        'tests/main/tests/integration/identifiers/scenarios-test.ts',
        'tests/main/tests/integration/identifiers/record-identifier-for-test.ts',
        'tests/main/tests/integration/identifiers/polymorphic-scenarios-test.ts',
        'tests/main/tests/integration/identifiers/new-records-test.ts',
        'tests/main/tests/integration/identifiers/lid-reflection-test.ts',
        'tests/main/tests/integration/identifiers/configuration-test.ts',
        'tests/main/tests/integration/identifiers/cache-test.ts',
        'tests/main/tests/helpers/accessors.ts',
      ],
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
        'tests/performance/server/**/*.js',
        'tests/*/ember-cli-build.js',
        'tests/*/index.js',
        'tests/*/testem.js',
        'tests/*/.ember-cli.js',
        'tests/*/.eslintrc.js',
        'tests/*/.template-lintrc.js',
        'tests/*/config/**/*.js',
        'tests/*/tests/dummy/config/**/*.js',
        'packages/-ember-data/lib/*.js',
        'packages/private-build-infra/src/**/*.js',
        'packages/unpublished-test-infra/src/**/*.js',
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
