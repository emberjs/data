import { A } from '@ember/array';
import { computed, get } from '@ember/object';
import MapWithDefault from '../map-with-default';
import Map from '../map';
import { assert } from '@ember/debug';
import { typeForRelationshipMeta, relationshipFromMeta } from '../relationship-meta';

export const relationshipsDescriptor = computed(function() {
  let map = new MapWithDefault({
    defaultValue() {
      return [];
    },
  });

  let relationshipsByName = get(this, 'relationshipsByName');

  // Loop through each computed property on the class
  relationshipsByName.forEach(desc => {
    let relationshipsForType = map.get(desc.type);
    relationshipsForType.push(desc);
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

      assert(
        `You specified a hasMany (${meta.type}) on ${meta.parentType} but ${
          meta.type
        } was not found.`,
        modelName
      );

      if (!types.includes(modelName)) {
        assert(
          `Trying to sideload ${name} on ${this.toString()} but the type doesn't exist.`,
          !!modelName
        );
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
      meta.name = name;
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
