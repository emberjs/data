import Model, { attr, belongsTo } from '@ember-data/model';
import AuditableMixin from '../mixins/auditable';

export const ModelWithMixinSchema = {
  'type': 'model-with-mixin',
  'legacy': true,
  'identity': {
    'kind': '@id',
    'name': 'id'
  },
  'fields': [
    {
      'kind': 'attribute',
      'name': 'title',
      'type': 'string'
    },
    {
      'kind': 'attribute',
      'name': 'content',
      'type': 'string'
    },
    {
      'kind': 'attribute',
      'name': 'published',
      'type': 'boolean',
      'options': {
        'defaultValue': false
      }
    },
    {
      'kind': 'belongsTo',
      'name': 'author',
      'type': 'user',
      'options': {
        'async': false
      }
    }
  ]
};