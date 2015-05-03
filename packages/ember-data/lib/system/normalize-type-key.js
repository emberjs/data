import {singularize} from 'ember-inflector/lib/system/string';

var dasherize = Ember.String.dasherize;
var camelize  = Ember.String.camelize;

/**
  All modelNames are dasherized internally. Changing this function may
  require changes to other normalization hooks (such as typeForRoot).
  @method normalizeModelName
  @private
  @param {String} type
  @return {String} if the adapter can generate one, an ID
*/
export default function normalizeModelName(modelName) {
  return singularize(dasherize(camelize(modelName)));
}
