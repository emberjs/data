import Controller from '@ember/controller';

export default Controller.extend({
  queryParams: ['limit', 'modelName', 'included', 'eagerMaterialize', 'eagerRelationships'],
  limit: 240,
  included: '',
  modelName: 'simple',
  eagerMaterialize: true,
  eagerRelationships: false
});
