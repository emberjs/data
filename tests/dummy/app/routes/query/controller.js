import Ember from 'ember';

const {
  Controller
} = Ember;

export default Controller.extend({
  queryParams: ['limit', 'modelName', 'included', 'eagerMaterialize', 'eagerRelationships'],
  limit: 240,
  included: '',
  modelName: 'simple',
  eagerMaterialize: true,
  eagerRelationships: false
});
