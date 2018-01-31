import { A } from '@ember/array';
import { computed, get } from '@ember/object';
import MapWithDefault from '@ember/map/with-default';
import Map from '@ember/map';
import Ember from 'ember';
import { assert } from '@ember/debug';
import {
  typeForRelationshipMeta,
  relationshipFromMeta
} from "../relationship-meta";

export const relationshipsDescriptor = computed(function() {
  if (Ember.testing === true && relationshipsDescriptor._cacheable === true) {
    relationshipsDescriptor._cacheable = false;
  }

  let map = new MapWithDefault({
    defaultValue() { return []; }
  });

  // Loop through each computed property on the class
  this.eachComputedProperty((name, meta) => {
    // If the computed property is a relationship, add
    // it to the map.
    if (meta.isRelationship) {
      meta.key = name;
      let relationshipsForType = map.get(typeForRelationshipMeta(meta));

      relationshipsForType.push({
        name: name,
        kind: meta.kind
      });
    }
  });

  return map;
}).readOnly();

export const relatedTypesDescriptor = computed(function() {
  if (Ember.testing === true && relatedTypesDescriptor._cacheable === true) {
    relatedTypesDescriptor._cacheable = false;
  }

  let modelName;
  let types = A();

  // Loop through each computed property on the class,
  // and create an array of the unique types involved
  // in relationships
  this.eachComputedProperty((name, meta) => {
    if (meta.isRelationship) {
      meta.key = name;
      modelName = typeForRelationshipMeta(meta);

      assert(`You specified a hasMany (${meta.type}) on ${meta.parentType} but ${meta.type} was not found.`, modelName);

      if (!types.includes(modelName)) {
        assert(`Trying to sideload ${name} on ${this.toString()} but the type doesn't exist.`, !!modelName);
        types.push(modelName);
      }
    }
  });

  return types;
}).readOnly();

export const relationshipsObjectDescriptor = computed(function() {
  let relationships = Object.create(null);
  this.eachComputedProperty((name, meta) => {
    if (meta.isRelationship) {
      meta.key = name;
      let relationship = relationshipFromMeta(meta);
      relationships[name] = relationship;
    }
  });
  return relationships;
});

export const relationshipsByNameDescriptor = computed(function() {
  let map = Map.create();
  let rels = get(this, 'relationshipsObject');
  let relationships = Object.keys(rels);

  for (let i=0; i < relationships.length; i++) {
    let key = relationships[i];
    let value = rels[key];

    map.set(value.key, value);
  }

  return map;
}).readOnly();
