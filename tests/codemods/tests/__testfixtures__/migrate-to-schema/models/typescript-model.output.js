import Model, { attr, belongsTo } from '@ember-data/model';

export const TypescriptModelSchema = {
  'type': 'typescript-model',
  'legacy': true,
  'identity': {
    'kind': '@id',
    'name': 'id'
  },
  'fields': [
    {
      'kind': 'attribute',
      'name': 'declare',
      'type': 'string'
    },
    {
      'kind': 'attribute',
      'name': 'declare',
      'type': 'string'
    },
    {
      'kind': 'attribute',
      'name': 'declare',
      'type': 'boolean',
      'options': {
        'defaultValue': false
      }
    },
    {
      'kind': 'belongsTo',
      'name': 'declare',
      'type': 'company',
      'options': {
        'async': false,
        'inverse': null
      }
    }
  ]
};