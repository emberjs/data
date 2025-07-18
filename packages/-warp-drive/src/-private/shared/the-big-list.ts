export const Main: string[] = [
  '@ember-data/active-record',
  '@ember-data/adapter',
  '@ember-data/codemods',
  '@ember-data/debug',
  '@ember-data/graph',
  '@ember-data/json-api',
  '@ember-data/legacy-compat',
  '@ember-data/model',
  '@ember-data/request-utils',
  '@ember-data/request',
  '@ember-data/rest',
  '@ember-data/serializer',
  '@ember-data/store',
  '@ember-data/tracking',
  '@warp-drive/build-config',
  '@warp-drive/core-types',
  '@warp-drive/diagnostic',
  '@warp-drive/ember',
  '@warp-drive/holodeck',
  '@warp-drive/schema-record',
  '@warp-drive/experiments',
  '@warp-drive/schema',
  'ember-data',
  'eslint-plugin-ember-data',
  'eslint-plugin-warp-drive',
  'warp-drive',
] as const;

export const Types: string[] = [
  '@ember-data-types/active-record',
  '@ember-data-types/adapter',
  '@ember-data-types/graph',
  '@ember-data-types/json-api',
  '@ember-data-types/legacy-compat',
  '@ember-data-types/model',
  '@ember-data-types/request-utils',
  '@ember-data-types/request',
  '@ember-data-types/rest',
  '@ember-data-types/serializer',
  '@ember-data-types/store',
  '@ember-data-types/tracking',
  '@warp-drive-types/core-types',
  'ember-data-types',
] as const;

export const Mirror: string[] = [
  '@ember-data-mirror/active-record',
  '@ember-data-mirror/adapter',
  '@ember-data-mirror/graph',
  '@ember-data-mirror/json-api',
  '@ember-data-mirror/legacy-compat',
  '@ember-data-mirror/model',
  '@ember-data-mirror/request-utils',
  '@ember-data-mirror/request',
  '@ember-data-mirror/rest',
  '@ember-data-mirror/serializer',
  '@ember-data-mirror/store',
  '@ember-data-mirror/tracking',
  '@warp-drive-mirror/build-config',
  '@warp-drive-mirror/core-types',
  '@warp-drive-mirror/schema-record',
  'ember-data-mirror',
] as const;

export const DefinitelyTyped: string[] = [
  '@types/ember',
  '@types/ember-data',
  '@types/ember-data__adapter',
  '@types/ember-data__model',
  '@types/ember-data__serializer',
  '@types/ember-data__store',
  '@types/ember__application',
  '@types/ember__array',
  '@types/ember__component',
  '@types/ember__controller',
  '@types/ember__debug',
  '@types/ember__destroyable',
  '@types/ember__engine',
  '@types/ember__error',
  '@types/ember__helper',
  '@types/ember__modifier',
  '@types/ember__object',
  '@types/ember__owner',
  '@types/ember__routing',
  '@types/ember__runloop',
  '@types/ember__service',
  '@types/ember__string',
  '@types/ember__template',
  '@types/ember__test',
  '@types/ember__utils',
] as const;

export const ALL: string[] = ([] as string[]).concat(Main, Types, Mirror);
