import Model from '@ember-data/model';

export const EmptyModelSchema = {
  'type': 'empty-model',
  'legacy': true,
  'identity': {
    'kind': '@id',
    'name': 'id'
  },
  'fields': []
};