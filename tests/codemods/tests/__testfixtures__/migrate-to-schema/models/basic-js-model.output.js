import Model, { attr, belongsTo } from '@ember-data/model';

export const BasicJsModelSchema = {
  'type': 'basic-js-model',
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
      'name': 'description',
      'type': 'string'
    },
    {
      'kind': 'attribute',
      'name': 'price',
      'type': 'number'
    },
    {
      'kind': 'belongsTo',
      'name': 'category',
      'type': 'category',
      'options': {
        'async': false
      }
    }
  ]
};