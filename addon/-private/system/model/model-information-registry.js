import Ember from 'ember';
import { assert, warn } from "ember-data/-private/debug";
import EmptyObject from "ember-data/-private/system/empty-object";
import {
  typeForRelationshipMeta,
  relationshipFromMeta
} from "ember-data/-private/system/relationship-meta";

const {Map, MapWithDefault, get} = Ember;

/**
 * Contains relationship information that used to live directly on
 * DS.Model subclasses. The ModelInformationRegistry is used to figure
 * out inverse relationships for classes and cache that information.
 *
 * @private
*/
export default Ember.Object.extend({
  init() {
    this._super(...arguments);
    this._inverseMaps = new EmptyObject();
    this._relationshipsByName = new EmptyObject();
    this._relationships = new EmptyObject();
    this._relatedTypes = new EmptyObject();
  },

  relationshipsByNameFor(modelName) {
    let map = this._relationshipsByName[modelName];

    if (!map) {
      map = this._relationshipsByName[modelName] = Map.create();
      let store = this.get('store');
      let modelType = store.modelFor(modelName);

      modelType.eachComputedProperty((name, meta) => {
        if (meta.isRelationship) {
          meta.key = name;
          let relationship = relationshipFromMeta(meta);
          relationship.type = typeForRelationshipMeta(meta);
          map.set(name, relationship);
        }
      });
    }
    return map;
  },

  relationshipsFor(modelName) {
    let map = this._relationships[modelName];

    if (!map) {
      map = this._relationships[modelName] = new MapWithDefault({
        defaultValue() { return []; }
      });

      let modelType = this.get('store').modelFor(modelName);

      // Loop through each computed property on the class
      modelType.eachComputedProperty((name, meta) => {
        // If the computed property is a relationship, add
        // it to the map.
        if (meta.isRelationship) {
          meta.key = name;
          var relationshipsForType = map.get(typeForRelationshipMeta(meta));

          relationshipsForType.push({
            name: name,
            kind: meta.kind
          });
        }
      });
    }

    return map;
  },

  inverseMapFor(modelName) {
    let map = this._inverseMaps[modelName];

    if (!map) {
      map = this._inverseMaps[modelName] = new EmptyObject();
    }

    return map;
  },

  inverseFor(modelName, name, store) {
    var inverseMap = this.inverseMapFor(modelName, name, store);
    if (inverseMap[name]) {
      return inverseMap[name];
    } else {
      var inverse = this._findInverseFor(modelName, name, store);
      inverseMap[name] = inverse;
      return inverse;
    }
  },

  //Calculate the inverse, ignoring the cache
  _findInverseFor(modelName, name, store) {

    var inverseType = this.typeForRelationship(modelName, name, store);
    if (!inverseType) {
      return null;
    }

    let modelType = this.get('store').modelFor(modelName);

    var propertyMeta = modelType.metaForProperty(name);
    //If inverse is manually specified to be null, like  `comments: DS.hasMany('message', { inverse: null })`
    var options = propertyMeta.options;
    if (options.inverse === null) { return null; }

    var inverseName, inverseKind, inverse;

    //If inverse is specified manually, return the inverse
    if (options.inverse) {
      inverseName = options.inverse;
      inverse = Ember.get(inverseType, 'relationshipsByName').get(inverseName);

      assert("We found no inverse relationships by the name of '" + inverseName + "' on the '" + inverseType.modelName +
        "' model. This is most likely due to a missing attribute on your model definition.", !Ember.isNone(inverse));

      inverseKind = inverse.kind;
    } else {
      //No inverse was specified manually, we need to use a heuristic to guess one
      if (propertyMeta.type === propertyMeta.parentType.modelName) {
        warn(`Detected a reflexive relationship by the name of '${name}' without an inverse option. Look at http://emberjs.com/guides/models/defining-models/#toc_reflexive-relation for how to explicitly specify inverses.`, false, {
          id: 'ds.model.reflexive-relationship-without-inverse'
        });
      }

      var possibleRelationships = findPossibleInverses(modelType, inverseType);

      if (possibleRelationships.length === 0) { return null; }

      var filteredRelationships = possibleRelationships.filter((possibleRelationship) => {
        var optionsForRelationship = inverseType.metaForProperty(possibleRelationship.name).options;
        return name === optionsForRelationship.inverse;
      });

      assert("You defined the '" + name + "' relationship on " + modelType + ", but you defined the inverse relationships of type " +
        inverseType.toString() + " multiple times. Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses",
        filteredRelationships.length < 2);

      if (filteredRelationships.length === 1 ) {
        possibleRelationships = filteredRelationships;
      }

      assert("You defined the '" + name + "' relationship on " + modelType + ", but multiple possible inverse relationships of type " +
        this + " were found on " + inverseType + ". Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses",
        possibleRelationships.length === 1);

      inverseName = possibleRelationships[0].name;
      inverseKind = possibleRelationships[0].kind;
    }

    function findPossibleInverses(type, inverseType, relationshipsSoFar) {
      var relationshipMap = get(inverseType, 'relationships');
      var possibleRelationships = relationshipsSoFar || [];

      if (!relationshipMap) { return possibleRelationships; }

      var relationships = relationshipMap.get(type.modelName);

      relationships = relationships.filter((relationship) => {
        var optionsForRelationship = inverseType.metaForProperty(relationship.name).options;

        if (!optionsForRelationship.inverse) {
          return true;
        }

        return name === optionsForRelationship.inverse;
      });

      if (relationships) {
        possibleRelationships.push.apply(possibleRelationships, relationships);
      }

      //Recurse to support polymorphism
      if (type.superclass) {
        findPossibleInverses(type.superclass, inverseType, possibleRelationships);
      }

      return possibleRelationships;
    }

    return {
      type: inverseType,
      name: inverseName,
      kind: inverseKind
    };
  },

  typeForRelationship(modelName, name, store) {
    let relationship = this.relationshipsByNameFor(modelName).get(name);
    return relationship && store.modelFor(relationship.type);
  },

  relatedTypesFor(modelName) {
    let types = this._relatedTypes[modelName];

    if (!types) {
      types = this._relatedTypes[modelName] = Ember.A();
      let modelType = this.get('store').modelFor(modelName);

      // Loop through each computed property on the class,
      // and create an array of the unique types involved
      // in relationships
      modelType.eachComputedProperty((name, meta) => {
        if (meta.isRelationship) {
          meta.key = name;
          let modelName = typeForRelationshipMeta(meta);

          assert("You specified a hasMany (" + meta.type + ") on " + meta.parentType + " but " + meta.type + " was not found.", modelName);

          if (!types.contains(modelName)) {
            assert("Trying to sideload " + name + " on " + this.toString() + " but the type doesn't exist.", !!modelName);
            types.push(modelName);
          }
        }
      });
    }

    return types;
  }
});

