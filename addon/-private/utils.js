import Ember from 'ember';

const get = Ember.get;

/*
  Check if the passed model has a `type` attribute or a relationship named `type`.

  @method modelHasAttributeOrRelationshipNamedType
  @param modelClass
 */
function modelHasAttributeOrRelationshipNamedType(modelClass) {
  return get(modelClass, 'attributes').has('type') || get(modelClass, 'relationshipsByName').has('type');
}

/*
  ember-container-inject-owner is a new feature in Ember 2.3 that finally provides a public
  API for looking items up.  This function serves as a super simple polyfill to avoid
  triggering deprecations.
*/
function getOwner(context) {
  var owner;

  if (Ember.getOwner) {
    owner = Ember.getOwner(context);
  }

  if (!owner && context.container) {
    owner = context.container;
  }

  if (owner && owner.lookupFactory && !owner._lookupFactory) {
    // `owner` is a container, we are just making this work
    owner._lookupFactory = owner.lookupFactory;
    owner.register = function() {
      var registry = owner.registry || owner._registry || owner;

      return registry.register(...arguments);
    };
  }

  return owner;
}

export {
  modelHasAttributeOrRelationshipNamedType,
  getOwner
};
