import { A } from '@ember/array';
import { assert } from '@ember/debug';
import { computed, get } from '@ember/object';

import { relationshipFromMeta, typeForRelationshipMeta } from '@ember-data/store/-private';

/**
  @module @ember-data/model
*/

export const relationshipsDescriptor = computed(function() {
  let map = new Map();
  let relationshipsByName = get(this, 'relationshipsByName');

  // Loop through each computed property on the class
  relationshipsByName.forEach(desc => {
    let { type } = desc;

    if (!map.has(type)) {
      map.set(type, []);
    }

    map.get(type).push(desc);
  });

  return map;
}).readOnly();

export const relatedTypesDescriptor = computed(function() {
  let parentModelName = this.modelName;
  let types = A();

  // Loop through each computed property on the class,
  // and create an array of the unique types involved
  // in relationships
  this.eachComputedProperty((name, meta) => {
    if (meta.isRelationship) {
      meta.key = name;
      let modelName = typeForRelationshipMeta(meta);

      assert(`You specified a hasMany (${meta.type}) on ${parentModelName} but ${meta.type} was not found.`, modelName);

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
  let modelName = this.modelName;
  this.eachComputedProperty((name, meta) => {
    if (meta.isRelationship) {
      meta.key = name;
      meta.name = name;
      meta.parentModelName = modelName;
      relationships[name] = relationshipFromMeta(meta);
    }
  });
  return relationships;
});

export const relationshipsByNameDescriptor = computed(function() {
  let map = new Map();
  let rels = get(this, 'relationshipsObject');
  let relationships = Object.keys(rels);

  for (let i = 0; i < relationships.length; i++) {
    let key = relationships[i];
    let value = rels[key];

    map.set(value.key, value);
  }

  return map;
}).readOnly();
