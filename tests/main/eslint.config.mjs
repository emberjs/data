// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as typescript from '@warp-drive/internal-config/eslint/typescript.js';
import * as qunit from '@warp-drive/internal-config/eslint/qunit.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // browser (js/ts) ================
  typescript.browser({
    srcDirs: ['app', 'tests'],
    allowedImports: ['@ember/application', '@ember/routing/route', '@ember/service'],
  }),

  // files converted to strict must pass these rules before they can be removed from
  // the files list here
  // see https://github.com/emberjs/data/issues/6233#issuecomment-849279594
  {
    files: [
      './tests/helpers/accessors.ts',
      './tests/integration/identifiers/configuration-test.ts',
      './tests/integration/identifiers/new-records-test.ts',
      // './tests/integration/identifiers/polymorphic-scenarios-test.ts',
      './tests/integration/identifiers/record-identifier-for-test.ts',
      './tests/integration/identifiers/scenarios-test.ts',
      './tests/integration/model-errors-test.ts',
      './tests/integration/record-data/record-data-errors-test.ts',
      './tests/integration/record-data/record-data-state-test.ts',
      './tests/integration/record-data/record-data-test.ts',
      './tests/integration/record-data/store-wrapper-test.ts',
      './tests/integration/relationships/rollback-test.ts',
      './tests/integration/request-state-service-test.ts',
      './tests/unit/custom-class-support/custom-class-model-test.ts',
    ],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  // node (module) ================
  node.esm(),

  // node (script) ================
  node.cjs({
    files: ['./config/fastboot.js', './config/fastboot-testing.js'],
  }),

  // Test Support ================
  qunit.ember({
    allowedImports: [
      '@ember/application',
      '@ember/array',
      '@ember/array/proxy',
      '@ember/component',
      '@ember/component/helper',
      '@ember/controller',
      '@ember/object',
      '@ember/object/computed',
      '@ember/object/mixin',
      '@ember/owner',
      '@ember/service',
      '@ember/string',
      '@glimmer/component',
      'ember-inflector',
    ],
  }),
];
