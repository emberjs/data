// @ts-check
import { globalIgnores } from '@warp-drive/internal-config/eslint/ignore.js';
import * as node from '@warp-drive/internal-config/eslint/node.js';
import * as typescript from '@warp-drive/internal-config/eslint/typescript.js';
import * as qunit from '@warp-drive/internal-config/eslint/qunit.js';
import * as js from '@warp-drive/internal-config/eslint/browser.js';
import * as gts from '@warp-drive/internal-config/eslint/gts.js';

const AllowedImports = [
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
  '@ember/routing/route',
  '@ember/runloop',
  '@ember/service',
  '@ember/test-helpers',
  '@ember/test-waiters',
  '@glimmer/component',
  '@glimmer/tracking',
  '@glimmer/validator',
  'qunit',
];

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // all ================
  globalIgnores(),

  // browser (js) ================
  js.browser({
    srcDirs: ['app', 'tests'],
    allowedImports: AllowedImports,
    globals: { gc: true },
  }),

  // browser (js/ts) ================
  typescript.browser({
    dirname: import.meta.dirname,
    srcDirs: ['app', 'tests'],
    allowedImports: AllowedImports,
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  }),

  // gts
  gts.browser({
    dirname: import.meta.dirname,
    srcDirs: ['app', 'tests'],
    allowedImports: AllowedImports,
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  }),

  // files converted to strict must pass these rules before they can be removed from
  // the files list here
  // see https://github.com/warp-drive-data/warp-drive/issues/6233#issuecomment-849279594
  {
    files: [
      'tests/helpers/accessors.ts',
      'tests/integration/identifiers/configuration-test.ts',
      'tests/integration/identifiers/new-records-test.ts',
      // 'tests/integration/identifiers/polymorphic-scenarios-test.ts',
      'tests/integration/identifiers/record-identifier-for-test.ts',
      'tests/integration/identifiers/scenarios-test.ts',
      'tests/integration/model-errors-test.ts',
      'tests/integration/record-data/record-data-errors-test.ts',
      'tests/integration/record-data/record-data-state-test.ts',
      'tests/integration/record-data/record-data-test.ts',
      'tests/integration/record-data/store-wrapper-test.ts',
      'tests/integration/relationships/rollback-test.ts',
      'tests/integration/request-state-service-test.ts',
      'tests/unit/custom-class-support/custom-class-model-test.ts',
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
  node.cjs(),

  // Test Support ================
  qunit.ember({
    allowedImports: AllowedImports,
  }),
];
