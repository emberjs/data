import { resourceSchema } from './fields';

// @ts-expect-error attribute field should result in an invalid schema
// unless marked legacy
resourceSchema({
  type: 'user',
  identity: { name: 'id', kind: '@id' },
  fields: [
    {
      name: 'name',
      kind: 'attribute',
    },
  ],
});
resourceSchema({
  legacy: true,
  type: 'user',
  identity: { name: 'id', kind: '@id' },
  fields: [
    {
      name: 'name',
      kind: 'attribute',
    },
  ],
});

// @ts-expect-error relationship field should result in an invalid schema
// unless marked legacy or linksMode
resourceSchema({
  type: 'user',
  identity: { name: 'id', kind: '@id' },
  fields: [
    {
      name: 'friends',
      kind: 'hasMany',
      type: 'user',
      options: { async: false, inverse: null },
    },
  ],
});
resourceSchema({
  legacy: true,
  type: 'user',
  identity: { name: 'id', kind: '@id' },
  fields: [
    {
      name: 'friends',
      kind: 'hasMany',
      type: 'user',
      options: { async: false, inverse: null },
    },
  ],
});
resourceSchema({
  type: 'user',
  identity: { name: 'id', kind: '@id' },
  fields: [
    {
      name: 'friends',
      kind: 'hasMany',
      type: 'user',
      options: {
        async: false,
        inverse: null,
        linksMode: true,
        resetOnRemoteUpdate: false,
      },
    },
  ],
});
