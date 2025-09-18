import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export const CustomTransformsSchema = {
  'type': 'custom-transforms',
  'legacy': true,
  'identity': {
    'kind': '@id',
    'name': 'id'
  },
  'fields': [
    {
      'kind': 'attribute',
      'name': 'orderNumber',
      'type': 'string'
    },
    {
      'kind': 'attribute',
      'name': 'createdAt',
      'type': 'date'
    },
    {
      'kind': 'attribute',
      'name': 'total',
      'type': 'currency'
    },
    {
      'kind': 'attribute',
      'name': 'metadata',
      'type': 'json'
    },
    {
      'kind': 'attribute',
      'name': 'tags',
      'type': 'array'
    },
    {
      'kind': 'belongsTo',
      'name': 'customer',
      'type': 'customer',
      'options': {
        'async': true
      }
    },
    {
      'kind': 'hasMany',
      'name': 'items',
      'type': 'order-item',
      'options': {
        'async': false,
        'inverse': 'order'
      }
    }
  ]
};