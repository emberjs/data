export interface Version {
  name: string;
  deprecated?: true;
  audience: '🐹' | '🌌' | '🌌🐹';
}
export const Versions = [
  {
    name: 'ember-data',
    audience: '🐹',
  },
  {
    name: 'warp-drive',
    audience: '🌌',
  },
  {
    name: 'eslint-plugin-warp-drive',
    audience: '🌌',
  },
  {
    name: '@ember-data/active-record',
    audience: '🌌',
  },
  {
    name: '@ember-data/adapter',
    audience: '🐹',
  },
  {
    name: '@ember-data/codemods',
    audience: '🐹',
  },
  {
    name: '@ember-data/debug',
    audience: '🐹',
  },
  {
    name: '@ember-data/serializer',
    audience: '🐹',
  },
  {
    name: '@ember-data/graph',
    audience: '🌌',
  },
  {
    name: '@ember-data/json-api',
    audience: '🌌🐹',
  },
  {
    name: '@ember-data/legacy-compat',
    audience: '🐹',
  },
  {
    name: '@ember-data/model',
    audience: '🐹',
  },
  {
    name: '@ember-data/request',
    audience: '🌌',
  },
  {
    name: '@ember-data/request-utils',
    audience: '🌌',
  },
  {
    name: '@ember-data/rest',
    audience: '🌌',
  },
  {
    name: '@ember-data/store',
    audience: '🌌',
  },
  {
    name: '@ember-data/tracking',
    deprecated: true,
    audience: '🐹',
  },
  {
    name: '@warp-drive/build-config',
    audience: '🌌',
  },
  {
    name: '@warp-drive/core-types',
    audience: '🌌',
  },
  {
    name: '@warp-drive/diagnostic',
    audience: '🌌',
  },
  {
    name: '@warp-drive/ember',
    audience: '🐹',
  },
  {
    name: '@warp-drive/experiments',
    audience: '🌌',
  },
  {
    name: '@warp-drive/holodeck',
    audience: '🌌',
  },
  {
    name: '@warp-drive/schema-record',
    audience: '🌌',
  },
] satisfies Version[];
