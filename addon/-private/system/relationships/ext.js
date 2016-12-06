import Ember from 'ember';
import { assert } from "ember-data/-private/debug";
import {
  typeForRelationshipMeta,
  relationshipFromMeta
} from "ember-data/-private/system/relationship-meta";

var get = Ember.get;
var Map = Ember.Map;
var MapWithDefault = Ember.MapWithDefault;

var relationshipsDescriptor = Ember.computed(function() {
  if (Ember.testing === true && relationshipsDescriptor._cacheable === true) {
    relationshipsDescriptor._cacheable = false;
  }

  var map = new MapWithDefault({
    defaultValue() { return []; }
  });

  // Loop through each computed property on the class
  this.eachComputedProperty((name, meta) => {
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

  return map;
}).readOnly();

var relatedTypesDescriptor = Ember.computed(function() {
  if (Ember.testing === true && relatedTypesDescriptor._cacheable === true) {
    relatedTypesDescriptor._cacheable = false;
  }

  var modelName;
  var types = Ember.A();

  // Loop through each computed property on the class,
  // and create an array of the unique types involved
  // in relationships
  this.eachComputedProperty((name, meta) => {
    if (meta.isRelationship) {
      meta.key = name;
      modelName = typeForRelationshipMeta(meta);

      assert("You specified a hasMany (" + meta.type + ") on " + meta.parentType + " but " + meta.type + " was not found.", modelName);

      if (!types.includes(modelName)) {
        assert("Trying to sideload " + name + " on " + this.toString() + " but the type doesn't exist.", !!modelName);
        types.push(modelName);
      }
    }
  });

  return types;
}).readOnly();

var relationshipsByNameDescriptor = Ember.computed(function() {
  if (Ember.testing === true && relationshipsByNameDescriptor._cacheable === true) {
    relationshipsByNameDescriptor._cacheable = false;
  }

  var map = Map.create();

  this.eachComputedProperty((name, meta) => {
    if (meta.isRelationship) {
      meta.key = name;
      var relationship = relationshipFromMeta(meta);
      relationship.type = typeForRelationshipMeta(meta);
      map.set(name, relationship);
    }
  });

  return map;
}).readOnly();

/**
  @module ember-data
*/

/*
  This file defines several extensions to the base `DS.Model` class that
  add support for one-to-many relationships.
*/

export const RelationshipsInstanceMethodsMixin = Ember.Mixin.create({
  /**
    Given a callback, iterates over each of the relationships in the model,
    invoking the callback with the name of each relationship and its relationship
    descriptor.


    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(name, descriptor);
    ```

    - `name` the name of the current property in the iteration
    - `descriptor` the meta object that describes this relationship

    The relationship descriptor argument is an object with the following properties.

   - **key** <span class="type">String</span> the name of this relationship on the Model
   - **kind** <span class="type">String</span> "hasMany" or "belongsTo"
   - **options** <span class="type">Object</span> the original options hash passed when the relationship was declared
   - **parentType** <span class="type">DS.Model</span> the type of the Model that owns this relationship
   - **type** <span class="type">String</span> the type name of the related Model

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context.

    Example

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      serialize: function(record, options) {
        var json = {};

        record.eachRelationship(function(name, descriptor) {
          if (descriptor.kind === 'hasMany') {
            var serializedHasManyName = name.toUpperCase() + '_IDS';
            json[serializedHasManyName] = record.get(name).mapBy('id');
          }
        });

        return json;
      }
    });
    ```

    @method eachRelationship
    @param {Function} callback the callback to invoke
    @param {any} binding the value to which the callback's `this` should be bound
  */
  eachRelationship(callback, binding) {
    this.constructor.eachRelationship(callback, binding);
  },

  relationshipFor(name) {
    return get(this.constructor, 'relationshipsByName').get(name);
  },

  inverseFor(key) {
    return this.constructor.inverseFor(key, this.store);
  }

});
