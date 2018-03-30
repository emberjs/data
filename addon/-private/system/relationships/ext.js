import { A } from '@ember/array';
import { computed } from '@ember/object';
import MapWithDefault from '../map-with-default';
import Map from '../map';
import { assert } from '@ember/debug';
import {
  typeForRelationshipMeta,
  relationshipFromMeta
} from "../relationship-meta";

export const relationshipsDescriptor = computed(function() {
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

export const relationshipsByNameDescriptor = computed(function() {
  let map = new Map();

  this.eachComputedProperty((name, meta) => {
    if (meta.isRelationship) {
      meta.key = name;
      let relationship = relationshipFromMeta(meta);
      relationship.type = typeForRelationshipMeta(meta);
      map.set(name, relationship);
    }
  });

  return map;
}).readOnly();
