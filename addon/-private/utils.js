import { getOwner as emberGetOwner } from '@ember/application';
import { get } from '@ember/object';

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
  let owner;

  if (emberGetOwner) {
    owner = emberGetOwner(context);
  } else if (context.container) {
    owner = context.container;
  }

  if (owner && owner.lookupFactory && !owner._lookupFactory) {
    // `owner` is a container, we are just making this work
    owner._lookupFactory = function() {
      return owner.lookupFactory(...arguments);
    }

    owner.register = function() {
      let registry = owner.registry || owner._registry || owner;

      return registry.register(...arguments);
    };
  }

  return owner;
}

export {
  modelHasAttributeOrRelationshipNamedType,
  getOwner
};
