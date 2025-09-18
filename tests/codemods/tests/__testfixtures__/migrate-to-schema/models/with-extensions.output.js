import Model, { attr } from '@ember-data/model';

export const WithExtensionsSchema = {
  'type': 'with-extensions',
  'legacy': true,
  'identity': {
    'kind': '@id',
    'name': 'id'
  },
  'fields': [
    {
      'kind': 'attribute',
      'name': 'firstName',
      'type': 'string'
    },
    {
      'kind': 'attribute',
      'name': 'lastName',
      'type': 'string'
    },
    {
      'kind': 'attribute',
      'name': 'email',
      'type': 'string'
    }
  ]
};