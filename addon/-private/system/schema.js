import EmptyObject from './empty-object';
import { assert, warn } from 'ember-data/-private/debug'
import Ember from 'ember';

const {
  get
} = Ember;

export default class Schema {
  constructor(modelClass, store) {
    this.primaryKey = 'id';
    this._attributes = null;
    this._relationships = null;
    this._relationshipMap = null;
    this._properties = null;
    this._expandedModel = false;
    this.modelClass = modelClass;
    this.modelName = modelClass.modelName;
    this._recordMap = null;
    this._inverseMap = null;
    this._adapter = null;
    this._serializer = null;
    this._superclass = null;
    this.store = store;
  }

  get superclass() {
    if (this._superclass === null) {
      let superclass = this.modelClass.superclass;

      this._superclass = superclass ? this.store.schemaFor(superclass.modelName) : undefined;
    }

    return this._superclass;
  }

  get adapter() {
    if (this._adapter === null) {
      this._adapter = this.store.adapterFor(this.modelName);
    }
    return this._adapter;
  }

  get serializer() {
    if (this._serializer === null) {
      this._serializer = this.store.serializerFor(this.modelName);
    }
    if (!this._serializer) {
      throw new Error('Cant find serializer!');
    }
    return this._serializer;
  }

  get properties() {
    if (this._expandedModel === false) {
      this._parseModelClass();
    }

    return this._properties;
  }

  get relationships() {
    if (this._expandedModel === false) {
      this._parseModelClass();
    }

    return this._relationships;
  }

  get relationshipMap() {
    if (this._expandedModel === false) {
      this._parseModelClass();
    }

    return this._relationshipMap;
  }

  eachRelationship(callback, context) {
    let relationships = this.relationships;

    for (let name in relationships) {
      let relationship = relationships[name];

      callback.call(context, name, relationship);
    }
  }

  get attributes() {
    if (this._expandedModel === false) {
      this._parseModelClass();
    }

    return this._attributes;
  }

  eachAttribute(callback, context) {
    let attributes = this.attributes;

    for (let name in attributes) {
      let attribute = attributes[name];

      callback.call(context, name, attribute);
    }
  }

  inverseFor(name, store) {
    const inverseMap = this.inverseMap;

    if (inverseMap[name]) {
      return inverseMap[name];
    }

    let inverse = this._findInverseFor(name, store);
    inverseMap[name] = inverse;

    return inverse;
  }

  get inverseMap() {
    if (this._inverseMap === null) {
      this._inverseMap = new EmptyObject();
    }
    return this._inverseMap;
  }

  schemaForRelationship(name, store) {
    let relationship = this.relationships[name];

    return relationship && store.schemaFor(relationship.type);
  }

  //Calculate the inverse, ignoring the cache
  _findInverseFor(name, store) {
    let inverseSchema = this.schemaForRelationship(name, store);

    if (!inverseSchema) {
      return null;
    }

    let propertyMeta = this.metaForProperty(name);

    // If inverse is manually specified to be null, like  `comments: DS.hasMany('message', { inverse: null })`
    let options = propertyMeta.options;
    if (options.inverse === null) {
      return null;
    }

    let inverseName;
    let inverseKind;
    let inverse;

    // If inverse is specified manually, return the inverse
    if (options.inverse) {
      inverseName = options.inverse;
      inverse = inverseSchema.relationships[inverseName];

      assert("We found no inverse relationships by the name of '" + inverseName + "' on the '" + inverseSchema.modelName +
        "' model. This is most likely due to a missing attribute on your model definition.", !Ember.isNone(inverse));

      inverseKind = inverse.kind;
    } else {
      //No inverse was specified manually, we need to use a heuristic to guess one
      if (propertyMeta.type === propertyMeta.parentType.modelName) {
        warn(`Detected a reflexive relationship by the name of '${name}' without an inverse option. Look at http://emberjs.com/guides/models/defining-models/#toc_reflexive-relation for how to explicitly specify inverses.`, false, {
          id: 'ds.model.reflexive-relationship-without-inverse'
        });
      }

      let possibleRelationships = findPossibleInverses(this, inverseSchema);

      if (possibleRelationships.length === 0) {
        return null;
      }

      let filteredRelationships = possibleRelationships.filter((possibleRelationship) => {
        let optionsForRelationship = inverseSchema.metaForProperty(possibleRelationship.name).options;

        return name === optionsForRelationship.inverse;
      });

      assert("You defined the '" + name + "' relationship on model:" + this.modelName + ", but you defined the inverse relationships of model:" +
        inverseSchema.modelName + " multiple times. Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses",
        filteredRelationships.length < 2);

      if (filteredRelationships.length === 1 ) {
        possibleRelationships = filteredRelationships;
      }

      assert("You defined the '" + name + "' relationship on model:" + this.modelName + ", but multiple possible inverse relationships of model:" +
        this.modelName + " were found on model:" + inverseSchema.modelName + ". Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses",
        possibleRelationships.length === 1);

      inverseName = possibleRelationships[0].name;
      inverseKind = possibleRelationships[0].kind;
    }

    return {
      type: inverseSchema,
      name: inverseName,
      kind: inverseKind
    };
  }

  metaForProperty(propertyName) {
    return this.properties[propertyName];
  }

  get recordMap() {
    if (this._recordMap === null) {
      this._recordMap = {
        idToRecord: new EmptyObject(),
        records: [],
        metadata: new EmptyObject(),
        type: this.model
      };
    }

    return this._recordMap;
  }

  // TODO @runspired should we allow sets? or just clears?
  set recordMap(v) {
    this._recordMap = v;
  }

  _parseModelClass() {
    let descriptors = get(this.modelClass, '_computedProperties');
    let attributes;
    let relationships;
    let relationshipMap;
    let properties = descriptors.length && new EmptyObject();

    for (let i = 0; i < descriptors.length; i++) {
      let value = descriptors[i];
      let key = value.name;

      if (value && value.meta) {
        if (value.meta.isAttribute === true) {
          properties[key] = value.meta;
          if (!attributes) {
            attributes = new EmptyObject();
          }
          attributes[key] = value.meta;
        } else if (value.meta.isRelationship === true) {
          properties[key] = value.meta;
          if (!relationships) {
            relationships = new EmptyObject();
            relationshipMap = new EmptyObject();
          }
          relationships[key] = value.meta;
          relationshipMap[value.meta.type] = relationshipMap[value.meta.type] || [];
          relationshipMap[value.meta.type].push(value.meta);
        }
      }
    }

    this._expandedModel = true;
    this._attributes = attributes;
    this._relationships = relationships;
    this._relationshipMap = relationshipMap;
    this._properties = properties;
  }
}

function findPossibleInverses(schema, inverseSchema, relationshipsSoFar) {
  let possibleRelationships = relationshipsSoFar || [];
  let relationshipMap = inverseSchema.relationshipMap;

  if (!relationshipMap) {
    return possibleRelationships;
  }

  var relationships = relationshipMap[schema.modelName];

  relationships = relationships.filter((relationship) => {
    var optionsForRelationship = inverseSchema.metaForProperty(relationship.name).options;

    if (!optionsForRelationship.inverse) {
      return true;
    }

    return name === optionsForRelationship.inverse;
  });

  if (relationships) {
    possibleRelationships.push.apply(possibleRelationships, relationships);
  }

  //Recurse to support polymorphism
  if (schema.superclass) {
    findPossibleInverses(schema.superclass, inverseSchema, possibleRelationships);
  }

  return possibleRelationships;
}
