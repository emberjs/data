const RESTRICTED_IMPORTS = [
  '@ember/-internals/metal',
  '@ember/application',
  '@ember/application/namespace',
  '@ember/array',
  '@ember/array/proxy',
  '@ember/component',
  '@ember/component/helper',
  '@ember/controller',
  '@ember/debug',
  '@ember/debug/data-adapter',
  '@ember/edition-utils',
  '@ember/object',
  '@ember/object/compat',
  '@ember/object/computed',
  '@ember/object/evented',
  '@ember/object/internals',
  '@ember/object/mixin',
  '@ember/object/promise-proxy-mixin',
  '@ember/object/proxy',
  '@ember/owner',
  '@ember/routing',
  '@ember/routing/route',
  '@ember/runloop',
  '@ember/service',
  '@ember/string',
  '@ember/test-helpers',
  '@ember/test-waiters',
  '@ember/utils',
  '@ember/version',
  '@glimmer/component',
  '@glimmer/env',
  '@glimmer/runtime',
  '@glimmer/tracking',
  '@glimmer/tracking/primitives/cache',
  '@glimmer/validator',
  'ember-inflector',
  'ember-qunit',
  'ember-source',
  'ember-source/types',
  'ember',
  'qunit',
  'testem',
];
export function rules(options) {
  return {
    'no-restricted-imports': [
      'error',
      {
        paths: options?.allowedImports
          ? RESTRICTED_IMPORTS.filter((path) => {
              return !options.allowedImports.includes(path);
            })
          : RESTRICTED_IMPORTS,
      },
    ],
    'no-restricted-globals': [
      'error',
      {
        name: 'QUnit',
        message: 'Please use the `qunit` import instead of referencing `QUnit` directly.',
      },
    ],
  };
}
