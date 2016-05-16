import Ember from 'ember';
import { assert, warn } from "ember-data/-private/debug";
import {
  typeForRelationshipMeta,
  relationshipFromMeta
} from "ember-data/-private/system/relationship-meta";
import EmptyObject from "ember-data/-private/system/empty-object";

var get = Ember.get;
var Map = Ember.Map;

var relationshipsDescriptor = Ember.computed(function() {
  return this.modelInformation.relationshipsFor(this.modelName);
}).readOnly();

var relatedTypesDescriptor = Ember.computed(function() {
  return this.modelInformation.relatedTypesFor(this.modelName);
}).readOnly();

var relationshipsByNameDescriptor = Ember.computed(function() {
  return this.modelInformation.relationshipsByNameFor(this.modelName);
}).readOnly();

/**
  @module ember-data
*/

/*
  This file defines several extensions to the base `DS.Model` class that
  add support for one-to-many relationships.
*/

/**
  @class Model
  @namespace DS
*/
export const DidDefinePropertyMixin = Ember.Mixin.create({

  /**
    This Ember.js hook allows an object to be notified when a property
    is defined.

    In this case, we use it to be notified when an Ember Data user defines a
    belongs-to relationship. In that case, we need to set up observers for
    each one, allowing us to track relationship changes and automatically
    reflect changes in the inverse has-many array.

    This hook passes the class being set up, as well as the key and value
    being defined. So, for example, when the user does this:

    ```javascript
    DS.Model.extend({
      parent: DS.belongsTo('user')
    });
    ```

    This hook would be called with "parent" as the key and the computed
    property returned by `DS.belongsTo` as the value.

    @method didDefineProperty
    @param {Object} proto
    @param {String} key
    @param {Ember.ComputedProperty} value
  */
  didDefineProperty(proto, key, value) {
    // Check if the value being set is a computed property.
    if (value instanceof Ember.ComputedProperty) {

      // If it is, get the metadata for the relationship. This is
      // populated by the `DS.belongsTo` helper when it is creating
      // the computed property.
      var meta = value.meta();

      meta.parentType = proto.constructor;
    }
  }
});

/*
  These DS.Model extensions add class methods that provide relationship
  introspection abilities about relationships.

  A note about the computed properties contained here:

  **These properties are effectively sealed once called for the first time.**
  To avoid repeatedly doing expensive iteration over a model's fields, these
  values are computed once and then cached for the remainder of the runtime of
  your application.

  If your application needs to modify a class after its initial definition
  (for example, using `reopen()` to add additional attributes), make sure you
  do it before using your model with the store, which uses these properties
  extensively.
*/

export const RelationshipsClassMethodsMixin = Ember.Mixin.create({

  /**
    For a given relationship name, returns the model type of the relationship.

    For example, if you define a model like this:

    ```app/models/post.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      comments: DS.hasMany('comment')
    });
   ```

    Calling `App.Post.typeForRelationship('comments')` will return `App.Comment`.

    @method typeForRelationship
    @static
    @param {String} name the name of the relationship
    @param {store} store an instance of DS.Store
    @return {DS.Model} the type of the relationship, or undefined
  */
  typeForRelationship(name, store) {
    return this.modelInformation.typeForRelationship(this.modelName, name, store);
  },

  inverseMap: Ember.computed(function() {
    return new EmptyObject();
  }),

  /**
    Find the relationship which is the inverse of the one asked for.

    For example, if you define models like this:

    ```app/models/post.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      comments: DS.hasMany('message')
    });
    ```

    ```app/models/message.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      owner: DS.belongsTo('post')
    });
    ```

    App.Post.inverseFor('comments') -> { type: App.Message, name: 'owner', kind: 'belongsTo' }
    App.Message.inverseFor('owner') -> { type: App.Post, name: 'comments', kind: 'hasMany' }

    @method inverseFor
    @static
    @param {String} name the name of the relationship
    @return {Object} the inverse relationship, or null
  */
  inverseFor(name, store) {
    return this.modelInformation.inverseFor(this.modelName, name, store);
  },

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

    var relationships = Ember.get(Blog, 'relationships');
    relationships.get(App.User);
    //=> [ { name: 'users', kind: 'hasMany' },
    //     { name: 'owner', kind: 'belongsTo' } ]
    relationships.get(App.Post);
    //=> [ { name: 'posts', kind: 'hasMany' } ]
    ```

    @property relationships
    @static
    @type Ember.Map
    @readOnly
  */

  relationships: relationshipsDescriptor,

  /**
    A hash containing lists of the model's relationships, grouped
    by the relationship kind. For example, given a model with this
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

    var relationshipNames = Ember.get(Blog, 'relationshipNames');
    relationshipNames.hasMany;
    //=> ['users', 'posts']
    relationshipNames.belongsTo;
    //=> ['owner']
    ```

    @property relationshipNames
    @static
    @type Object
    @readOnly
  */
  relationshipNames: Ember.computed(function() {
    var names = {
      hasMany: [],
      belongsTo: []
    };

    this.eachComputedProperty((name, meta) => {
      if (meta.isRelationship) {
        names[meta.kind].push(name);
      }
    });

    return names;
  }),

  /**
    An array of types directly related to a model. Each type will be
    included once, regardless of the number of relationships it has with
    the model.

    For example, given a model with this definition:

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

    var relatedTypes = Ember.get(Blog, 'relatedTypes');
    //=> [ App.User, App.Post ]
    ```

    @property relatedTypes
    @static
    @type Ember.Array
    @readOnly
  */
  relatedTypes: relatedTypesDescriptor,

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

    var relationshipsByName = Ember.get(Blog, 'relationshipsByName');
    relationshipsByName.get('users');
    //=> { key: 'users', kind: 'hasMany', type: App.User }
    relationshipsByName.get('owner');
    //=> { key: 'owner', kind: 'belongsTo', type: App.User }
    ```

    @property relationshipsByName
    @static
    @type Ember.Map
    @readOnly
  */
  relationshipsByName: relationshipsByNameDescriptor,

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

    var fields = Ember.get(Blog, 'fields');
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
  fields: Ember.computed(function() {
    var map = Map.create();

    this.eachComputedProperty((name, meta) => {
      if (meta.isRelationship) {
        map.set(name, meta.kind);
      } else if (meta.isAttribute) {
        map.set(name, 'attribute');
      }
    });

    return map;
  }).readOnly(),

  /**
    Given a callback, iterates over each of the relationships in the model,
    invoking the callback with the name of each relationship and its relationship
    descriptor.

    @method eachRelationship
    @static
    @param {Function} callback the callback to invoke
    @param {any} binding the value to which the callback's `this` should be bound
  */
  eachRelationship(callback, binding) {
    get(this, 'relationshipsByName').forEach((relationship, name) => {
      callback.call(binding, name, relationship);
    });
  },

  /**
    Given a callback, iterates over each of the types related to a model,
    invoking the callback with the related type's class. Each type will be
    returned just once, regardless of how many different relationships it has
    with a model.

    @method eachRelatedType
    @static
    @param {Function} callback the callback to invoke
    @param {any} binding the value to which the callback's `this` should be bound
  */
  eachRelatedType(callback, binding) {
    let relationshipTypes = get(this, 'relatedTypes');

    for (let i = 0; i < relationshipTypes.length; i++) {
      let type = relationshipTypes[i];
      callback.call(binding, type);
    }
  },

  determineRelationshipType(knownSide, store) {
    let knownKey = knownSide.key;
    let knownKind = knownSide.kind;
    let inverse = this.inverseFor(knownKey, store);
    let key, otherKind;

    if (!inverse) {
      return knownKind === 'belongsTo' ? 'oneToNone' : 'manyToNone';
    }

    key = inverse.name;
    otherKind = inverse.kind;

    if (otherKind === 'belongsTo') {
      return knownKind === 'belongsTo' ? 'oneToOne' : 'manyToOne';
    } else {
      return knownKind === 'belongsTo' ? 'oneToMany' : 'manyToMany';
    }
  }

});

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
   - **type** <span class="type">DS.Model</span> the type of the related Model

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
