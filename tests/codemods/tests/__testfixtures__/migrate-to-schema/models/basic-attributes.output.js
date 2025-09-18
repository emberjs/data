import Model, { attr } from '@ember-data/model';

export const BasicAttributesSchema = {
  'type': 'basic-attributes',
  'legacy': true,
  'identity': {
    'kind': '@id',
    'name': 'id'
  },
  'fields': [
    {
      'kind': 'attribute',
      'name': 'name',
      'type': 'string'
    },
    {
      'kind': 'attribute',
      'name': 'email',
      'type': 'string'
    },
    {
      'kind': 'attribute',
      'name': 'isActive',
      'type': 'boolean',
      'options': {
        'defaultValue': false
      }
    },
    {
      'kind': 'attribute',
      'name': 'age',
      'type': 'number'
    }
  ]
};