import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export const RelationshipsSchema = {
  'type': 'relationships',
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
      'kind': 'belongsTo',
      'name': 'company',
      'type': 'company',
      'options': {
        'async': false,
        'inverse': null
      }
    },
    {
      'kind': 'hasMany',
      'name': 'projects',
      'type': 'project',
      'options': {
        'async': true,
        'inverse': 'owner'
      }
    }
  ]
};