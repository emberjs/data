import Ember from 'ember';

const {
  Controller
} = Ember;

export default Controller.extend({
  queryParams: ['limit', 'modelName'],
  limit: 240,
  modelName: 'simple'
});
