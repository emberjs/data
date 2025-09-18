import Model, { attr, belongsTo } from '@ember-data/model';

/**
 * User model representing a system user
 * @class User
 */

export const WithCommentsSchema = {
  'type': 'with-comments',
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
      'kind': 'belongsTo',
      'name': 'company',
      'type': 'company',
      'options': {
        'async': false,
        'inverse': null
      }
    }
  ]
};