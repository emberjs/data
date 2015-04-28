import {singularize} from 'ember-inflector/lib/system/string';

var camelize = Ember.String.camelize;

// TODO: should dasherize!
/**
  All typeKeys are camelCase internally. Changing this function may
  require changes to other normalization hooks (such as typeForRoot).

  @method normalizeTypeKey
  @private
  @param {String} type
  @return {String} if the adapter can generate one, an ID
*/
export default function normalizeTypeKey(typeKey) {
  return camelize(singularize(typeKey));
}
