import Ember from 'ember';
import {
  relationshipFromMeta
} from 'ember-data/-private/system/relationship-meta';
import { assert, warn } from "ember-data/-private/debug";

const {
  get,
  Map,
  A
} = Ember;

function findPossibleInverses(type, inverseType, name, relationshipsSoFar) {
  let possibleRelationships = relationshipsSoFar || [];
  let relationshipMap = get(inverseType, 'relationships');

  if (!relationshipMap) { return possibleRelationships; }

  let relationships = relationshipMap.get(type.modelName).filter(relationship => {
    let optionsForRelationship = inverseType.metaForProperty(relationship.name).options;

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
    findPossibleInverses(type.superclass, inverseType, name, possibleRelationships);
  }

  return possibleRelationships;
}


export default class InternalModelClass {
  constructor(modelClass) {
    let attributes;
    let relationships;
    let descriptors = get(modelClass, '_computedProperties');
    let relationshipMap;
    let properties = descriptors.length ? Object.create(null) : null;

    for (let i = 0; i < descriptors.length; i++) {
      let value = descriptors[i];
      let key = value.name;

      if (value && value.meta) {
        let propertyMeta = value.meta;
        propertyMeta.key = key;

        if (propertyMeta.isAttribute === true) {
          if (!attributes) {
            attributes = Object.create(null);
          }

          propertyMeta.kind = 'attribute';
          properties[key] = propertyMeta;
          attributes[key] = propertyMeta;

        } else if (propertyMeta.isRelationship === true) {
          if (!relationships) {
            relationships = Object.create(null);
            relationshipMap = Object.create(null);
          }
          let relationshipMeta = relationshipFromMeta(propertyMeta);

          properties[key] = propertyMeta;
          relationships[key] = relationshipMeta;

          relationshipMap[propertyMeta.type] = relationshipMap[propertyMeta.type] || [];
          relationshipMap[propertyMeta.type].push(propertyMeta);
        }
      }
    }


    /**
     Represents the model's class name as a string. This can be used to look up the model through
     DS.Store's modelFor method.

     `modelName` is generated for you by Ember Data. It will be a lowercased, dasherized string.
     For example:

     ```javascript
     store.modelFor('post').modelName; // 'post'
     store.modelFor('blog-post').modelName; // 'blog-post'
     ```

     The most common place you'll want to access `modelName` is in your serializer's `payloadKeyFromModelName` method. For example, to change payload
     keys to underscore (instead of dasherized), you might use the following code:

     ```javascript
     export default const PostSerializer = DS.RESTSerializer.extend({
     payloadKeyFromModelName: function(modelName) {
       return Ember.String.underscore(modelName);
     }
   });
     ```
     @property modelName
     @type String
     @readonly
     @static
     */
    this.modelName = modelClass.modelName;
    this.modelClass = modelClass;
    this._attributes = attributes;
    this._relationships = relationships;
    this._properties = properties;

    // for deprecated things
    this._relationshipMap = relationshipMap;
  }

  metaForProperty(name) {
    return this._properties[name];
  }

  eachRelationship(cb, context) {
    let relationships = this._relationships;

    if (relationships) {
      let exec = cb.bind(context);

      for (let name in relationships) {
        let relationship = relationships[name];

        exec(name, relationship);
      }
    }
  }

  eachAttribute(cb, context) {
    let attributes = this._attributes;

    if (attributes) {
      let exec = cb.bind(context);

      for (let name in attributes) {
        let attribute = attributes[name];

        exec(name, attribute);
      }
    }
  }

  inverseFor(name, store) {
    let inverseMap = get(this, 'inverseMap');
    if (inverseMap[name]) {
      return inverseMap[name];
    } else {
      let inverse = this._findInverseFor(name, store);
      inverseMap[name] = inverse;
      return inverse;
    }
  }

  _findInverseFor(name, store) {
    let inverseType = this.typeForRelationship(name, store);
    if (!inverseType) {
      return null;
    }

    let propertyMeta = this.metaForProperty(name);
    //If inverse is manually specified to be null, like  `comments: DS.hasMany('message', { inverse: null })`
    let options = propertyMeta.options;

    if (options.inverse === null) {
      return null;
    }

    let inverseName, inverseKind, inverse;

    //If inverse is specified manually, return the inverse
    if (options.inverse) {
      inverseName = options.inverse;
      inverse = get(inverseType, 'relationshipsByName').get(inverseName);

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

      let possibleRelationships = findPossibleInverses(this.modelClass, inverseType, name);

      if (possibleRelationships.length === 0) { return null; }

      let filteredRelationships = possibleRelationships.filter((possibleRelationship) => {
        let optionsForRelationship = inverseType.metaForProperty(possibleRelationship.name).options;
        return name === optionsForRelationship.inverse;
      });

      assert("You defined the '" + name + "' relationship on " + this.modelClass + ", but you defined the inverse relationships of type " +
        inverseType.toString() + " multiple times. Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses",
        filteredRelationships.length < 2);

      if (filteredRelationships.length === 1 ) {
        possibleRelationships = filteredRelationships;
      }

      assert("You defined the '" + name + "' relationship on " + this.modelClass + ", but multiple possible inverse relationships of type " +
        this + " were found on " + inverseType + ". Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses",
        possibleRelationships.length === 1);

      inverseName = possibleRelationships[0].name;
      inverseKind = possibleRelationships[0].kind;
    }

    return {
      type: inverseType,
      name: inverseName,
      kind: inverseKind
    };
  }

  /**
   For a given relationship name, returns the model type of the relationship.

   For example, if you define a model like this:

   ```app/models/post.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      comments: DS.hasMany('comment')
    });
   ```

   Calling `store.modelFor('post').typeForRelationship('comments', store)` will return `Comment`.

   @method typeForRelationship
   @static
   @param {String} name the name of the relationship
   @param {store} store an instance of DS.Store
   @return {DS.Model} the type of the relationship, or undefined
   */
  typeForRelationship(name, store) {
    let relationship = this.relationshipsByName.get(name);
    return relationship && store.modelFor(relationship.type);
  }

  get inverseMap() {
    return this._inverseMap || (this._inverseMap = Object.create(null));
  }

  /**
   The model's relationships as a map, keyed on the type of the
   relationship. The value of each entry is an array containing a descriptor
   for each relationship with that type, describing the name of the relationship
   as well as the type.

   For example, given the following model definition:

   ```app/models/blog.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      users: DS.hasMany('user'),
      owner: DS.belongsTo('user'),
      posts: DS.hasMany('post')
    });
   ```

   This computed property would return a map describing these
   relationships, like this:

   ```javascript
   import Ember from 'ember';
   import Blog from 'app/models/blog';
   import User from 'app/models/user';
   import Post from 'app/models/post';

   let relationships = Ember.get(Blog, 'relationships');
   relationships.get(User);
   //=> [ { name: 'users', kind: 'hasMany' },
   //     { name: 'owner', kind: 'belongsTo' } ]
   relationships.get(Post);
   //=> [ { name: 'posts', kind: 'hasMany' } ]
   ```

   @property relationships
   @static
   @type Ember.Map
   @readOnly
   */
  get relationships() {
    if (!this.__relationshipsMap) {
      let map = this.__relationshipsMap = new Ember.MapWithDefault({
        defaultValue() { return []; }
      });

      for (let name in this._relationships) {
        let meta = this._relationships[name];
        let relationshipsForType = map.get(meta.type);

        relationshipsForType.push({
          name,
          kind: meta.kind
        });
      }
    }

    return this.__relationshipsMap;
  }

  /**
   Unused Internally
   */
  get relationshipNames() {
    if (!this.__relationshipNames) {
      let names = this.__relationshipNames = {
        hasMany: [],
        belongsTo: []
      };

      for (let name in this._relationships) {
        let meta = this._relationships[name];
        names[meta.kind].push(name);
      }
    }

    return this.__relationshipNames;
  }

  /**
    Unused Internally
   */
  get relatedTypes() {
    if (!this.__relatedTypes) {
      let modelName;
      let types = this.__relatedTypes = new A();

      // Loop through each computed property on the class,
      // and create an array of the unique types involved
      // in relationships
      for (let name in this._relationships) {
        let meta = this._relationships[name];
        modelName = meta.type;

        if (!types.includes(modelName)) {
          // TODO WTF is this error doing in this location
          assert("Trying to sideload " + name + " on " + this.toString() + " but the type doesn't exist.", !!modelName);
          types.push(modelName);
        }
      }
    }

    return this.__relatedTypes;
  }

  /**
   A map whose keys are the relationships of a model and whose values are
   relationship descriptors.

   For example, given a model with this
   definition:

   ```app/models/blog.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      users: DS.hasMany('user'),
      owner: DS.belongsTo('user'),

      posts: DS.hasMany('post')
    });
   ```

   This property would contain the following:

   ```javascript
   import Ember from 'ember';
   import Blog from 'app/models/blog';

   let relationshipsByName = Ember.get(Blog, 'relationshipsByName');
   relationshipsByName.get('users');
   //=> { key: 'users', kind: 'hasMany', type: 'user', options: Object, isRelationship: true }
   relationshipsByName.get('owner');
   //=> { key: 'owner', kind: 'belongsTo', type: 'user', options: Object, isRelationship: true }
   ```

   @property relationshipsByName
   @static
   @type Ember.Map
   @readOnly
   */
  get relationshipsByName() {
    if (!this.__relationshipsByNameMap) {
      let map = this.__relationshipsByNameMap = Map.create();

      for (let name in this._relationships) {
        let meta = this._relationships[name];
        map.set(name, meta);
      }
    }

    return this.__relationshipsByNameMap;
  }

  /**
   A map whose keys are the fields of the model and whose values are strings
   describing the kind of the field. A model's fields are the union of all of its
   attributes and relationships.

   For example:

   ```app/models/blog.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      users: DS.hasMany('user'),
      owner: DS.belongsTo('user'),

      posts: DS.hasMany('post'),

      title: DS.attr('string')
    });
   ```

   ```js
   import Ember from 'ember';
   import Blog from 'app/models/blog';

   let fields = Ember.get(Blog, 'fields');
   fields.forEach(function(kind, field) {
      console.log(field, kind);
    });

   // prints:
   // users, hasMany
   // owner, belongsTo
   // posts, hasMany
   // title, attribute
   ```

   @property fields
   @static
   @type Ember.Map
   @readOnly
   */
  get fields() {
    if (!this.__fieldsMap) {
      let map = this.__fieldsMap = Map.create();

      for (let name in this._properties) {
        let meta = this._properties[name];

        map.set(name, meta.kind);
      }
    }

    return this.__fieldsMap;
  }

  /**
   A map whose keys are the attributes of the model (properties
   described by DS.attr) and whose values are the meta object for the
   property.

   Example

   ```app/models/person.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      birthday: attr('date')
    });
   ```

   ```javascript
   import Ember from 'ember';
   import Person from 'app/models/person';

   let attributes = Ember.get(Person, 'attributes')

   attributes.forEach(function(meta, name) {
      console.log(name, meta);
    });

   // prints:
   // firstName {type: "string", isAttribute: true, options: Object, parentType: function, name: "firstName"}
   // lastName {type: "string", isAttribute: true, options: Object, parentType: function, name: "lastName"}
   // birthday {type: "date", isAttribute: true, options: Object, parentType: function, name: "birthday"}
   ```

   @property attributes
   @static
   @type {Ember.Map}
   @readOnly
   */
  get attributes() {
    if (!this.__attributesMap) {
      let map = this.__attributesMap = Map.create();

      for (let name in this._attributes) {
        let meta = this._attributes[name];

        map.set(name, meta);
      }
    }

    return this.__attributesMap;
  }

  /**
   A map whose keys are the attributes of the model (properties
   described by DS.attr) and whose values are type of transformation
   applied to each attribute. This map does not include any
   attributes that do not have an transformation type.

   Example

   ```app/models/person.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      firstName: attr(),
      lastName: attr('string'),
      birthday: attr('date')
    });
   ```

   ```javascript
   import Ember from 'ember';
   import Person from 'app/models/person';

   let transformedAttributes = Ember.get(Person, 'transformedAttributes')

   transformedAttributes.forEach(function(field, type) {
      console.log(field, type);
    });

   // prints:
   // lastName string
   // birthday date
   ```

   @property transformedAttributes
   @static
   @type {Ember.Map}
   @readOnly
   */
  get transformedAttributes() {
    if  (!this.__transformedAttributesMap) {
      let map = this.__transformedAttributesMap = Map.create();

      for (let name in this._attributes) {
        let meta = this._attributes[name];

        if (meta.type) {
          map.set(name, meta.type);
        }
      }
    }

    return this.__transformedAttributesMap;
  }

  /**
   Unused internally
   */
  eachRelatedType(callback, binding) {
    let relationshipTypes = get(this, 'relatedTypes');

    for (let i = 0; i < relationshipTypes.length; i++) {
      let type = relationshipTypes[i];
      callback.call(binding, type);
    }
  }

  /**
   Used once by json-serializer
   */
  eachTransformedAttribute(callback, binding) {
    get(this, 'transformedAttributes').forEach((type, name) => {
      callback.call(binding, name, type);
    });
  }

  determineRelationshipType(knownSide, store) {
    let knownKey = knownSide.key;
    let knownKind = knownSide.kind;
    let inverse = this.inverseFor(knownKey, store);
    // let key;
    let otherKind;

    if (!inverse) {
      return knownKind === 'belongsTo' ? 'oneToNone' : 'manyToNone';
    }

    // key = inverse.name;
    otherKind = inverse.kind;

    if (otherKind === 'belongsTo') {
      return knownKind === 'belongsTo' ? 'oneToOne' : 'manyToOne';
    } else {
      return knownKind === 'belongsTo' ? 'oneToMany' : 'manyToMany';
    }
  }
}
