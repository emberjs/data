import {singularize} from 'ember-inflector/lib/system/string';

var dasherize = Ember.String.dasherize;
var camelize  = Ember.String.camelize;

/**
  All typeKeys are dasherized internally. Changing this function may
  require changes to other normalization hooks (such as typeForRoot).
  @method normalizeTypeKey
  @private
  @param {String} type
  @return {String} if the adapter can generate one, an ID
*/
export default function normalizeTypeKey(typeKey) {
  return singularize(dasherize(camelize(typeKey)));
}
