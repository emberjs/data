const base = require('@warp-drive/internal-config/eslint/base.cjs');
const ignore = require('@warp-drive/internal-config/eslint/ignore.cjs');
const imports = require('@warp-drive/internal-config/eslint/imports.cjs');
const isolation = require('@warp-drive/internal-config/eslint/isolation.cjs');
const node = require('@warp-drive/internal-config/eslint/node.cjs');
const parser = require('@warp-drive/internal-config/eslint/parser.cjs');
const qunit = require('@warp-drive/internal-config/eslint/qunit.cjs');
const typescript = require('@warp-drive/internal-config/eslint/typescript.cjs');

module.exports = {
  ...parser.defaults(),
  ...base.settings(),

  plugins: [...base.plugins(), ...imports.plugins()],
  extends: [...base.extend()],
  rules: Object.assign(
    base.rules(),
    imports.rules(),
    isolation.rules({
      allowedImports: ['@ember/application', '@ember/routing/route', '@ember/service'],
    }),
    {}
  ),

  ignorePatterns: ignore.ignoreRules(),

  overrides: [
    node.config(),
    node.defaults(),
    typescript.defaults(),
    // files converted to strict must pass these rules before they can be removed from
    // the files list here
    // see https://github.com/emberjs/data/issues/6233#issuecomment-849279594
    typescript.defaults({
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
    }),
    qunit.defaults({
      files: ['tests/**/*.{js,ts}'],
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
  ],
};
