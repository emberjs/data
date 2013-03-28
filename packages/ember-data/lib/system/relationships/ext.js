var get = Ember.get, set = Ember.set;

/**
  @private

  This file defines several extensions to the base `DS.Model` class that
  add support for one-to-many relationships.
*/

DS.Model.reopen({
  // This Ember.js hook allows an object to be notified when a property
  // is defined.
  //
  // In this case, we use it to be notified when an Ember Data user defines a
  // belongs-to relationship. In that case, we need to set up observers for
  // each one, allowing us to track relationship changes and automatically
  // reflect changes in the inverse has-many array.
  //
  // This hook passes the class being set up, as well as the key and value
  // being defined. So, for example, when the user does this:
  //
  //   DS.Model.extend({
  //     parent: DS.belongsTo(App.User)
  //   });
  //
  // This hook would be called with "parent" as the key and the computed
  // property returned by `DS.belongsTo` as the value.
  didDefineProperty: function(proto, key, value) {
    // Check if the value being set is a computed property.
    if (value instanceof Ember.Descriptor) {

      // If it is, get the metadata for the relationship. This is
      // populated by the `DS.belongsTo` helper when it is creating
      // the computed property.
      var meta = value.meta();

      if (meta.isRelationship && meta.kind === 'belongsTo') {
        Ember.addObserver(proto, key, null, 'belongsToDidChange');
        Ember.addBeforeObserver(proto, key, null, 'belongsToWillChange');
      }

      if (meta.isAttribute) {
        Ember.addObserver(proto, key, null, 'attributeDidChange');
        Ember.addBeforeObserver(proto, key, null, 'attributeWillChange');
      }

      meta.parentType = proto.constructor;
    }
  }
});

/**
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

DS.Model.reopenClass({
  /**
    For a given relationship name, returns the model type of the relationship.

    For example, if you define a model like this:

        App.Post = DS.Model.extend({
          comments: DS.hasMany(App.Comment)
        });

    Calling `App.Post.typeForRelationship('comments')` will return `App.Comment`.

    @param {String} name the name of the relationship
    @return {subclass of DS.Model} the type of the relationship, or undefined
  */
  typeForRelationship: function(name) {
    var relationship = get(this, 'relationshipsByName').get(name);
    return relationship && relationship.type;
  },

  /**
    The model's relationships as a map, keyed on the type of the
    relationship. The value of each entry is an array containing a descriptor
    for each relationship with that type, describing the name of the relationship
    as well as the type.

    For example, given the following model definition:

        App.Blog = DS.Model.extend({
          users: DS.hasMany(App.User),
          owner: DS.belongsTo(App.User),
          posts: DS.hasMany(App.Post)
        });

    This computed property would return a map describing these
    relationships, like this:

        var relationships = Ember.get(App.Blog, 'relationships');
        associatons.get(App.User);
        //=> [ { name: 'users', kind: 'hasMany' },
        //     { name: 'owner', kind: 'belongsTo' } ]
        relationships.get(App.Post);
        //=> [ { name: 'posts', kind: 'hasMany' } ]

    @type Ember.Map
    @readOnly
  */
  relationships: Ember.computed(function() {
    var map = new Ember.MapWithDefault({
      defaultValue: function() { return []; }
    });

    // Loop through each computed property on the class
    this.eachComputedProperty(function(name, meta) {

      // If the computed property is a relationship, add
      // it to the map.
      if (meta.isRelationship) {
        if (typeof meta.type === 'string') {
          meta.type = Ember.get(Ember.lookup, meta.type);
        }

        var relationshipsForType = map.get(meta.type);

        relationshipsForType.push({ name: name, kind: meta.kind });
      }
    });

    return map;
  }),

  /**
    A hash containing lists of the model's relationships, grouped
    by the relationship kind. For example, given a model with this
    definition:

        App.Blog = DS.Model.extend({
          users: DS.hasMany(App.User),
          owner: DS.belongsTo(App.User),

          posts: DS.hasMany(App.Post)
        });

    This property would contain the following:

       var relationshipNames = Ember.get(App.Blog, 'relationshipNames');
       relationshipNames.hasMany;
       //=> ['users', 'posts']
       relationshipNames.belongsTo;
       //=> ['owner']

    @type Object
    @readOnly
  */
  relationshipNames: Ember.computed(function() {
    var names = { hasMany: [], belongsTo: [] };

    this.eachComputedProperty(function(name, meta) {
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

        App.Blog = DS.Model.extend({
          users: DS.hasMany(App.User),
          owner: DS.belongsTo(App.User),
          posts: DS.hasMany(App.Post)
        });

    This property would contain the following:

       var relatedTypes = Ember.get(App.Blog, 'relatedTypes');
       //=> [ App.User, App.Post ]

    @type Ember.Array
    @readOnly
  */
  relatedTypes: Ember.computed(function() {
    var type,
        types = Ember.A([]);

    // Loop through each computed property on the class,
    // and create an array of the unique types involved
    // in relationships
    this.eachComputedProperty(function(name, meta) {
      if (meta.isRelationship) {
        type = meta.type;

        if (typeof type === 'string') {
          type = get(this, type, false) || get(Ember.lookup, type);
        }

        if (!types.contains(type)) {
          Ember.assert("Trying to sideload " + name + " on " + this.toString() + " but the type doesn't exist.", !!type);
          types.push(type);
        }
      }
    });

    return types;
  }),

  /**
    A map whose keys are the relationships of a model and whose values are
    relationship descriptors.

    For example, given a model with this
    definition:

        App.Blog = DS.Model.extend({
          users: DS.hasMany(App.User),
          owner: DS.belongsTo(App.User),

          posts: DS.hasMany(App.Post)
        });

    This property would contain the following:

       var relationshipsByName = Ember.get(App.Blog, 'relationshipsByName');
       relationshipsByName.get('users');
       //=> { key: 'users', kind: 'hasMany', type: App.User }
       relationshipsByName.get('owner');
       //=> { key: 'owner', kind: 'belongsTo', type: App.User }

    @type Ember.Map
    @readOnly
  */
  relationshipsByName: Ember.computed(function() {
    var map = Ember.Map.create(), type;

    this.eachComputedProperty(function(name, meta) {
      if (meta.isRelationship) {
        meta.key = name;
        type = meta.type;

        if (typeof type === 'string') {
          type = get(this, type, false) || get(Ember.lookup, type);
          meta.type = type;
        }

        map.set(name, meta);
      }
    });

    return map;
  }),

  /**
    A map whose keys are the fields of the model and whose values are strings
    describing the kind of the field. A model's fields are the union of all of its
    attributes and relationships.

    For example:

        App.Blog = DS.Model.extend({
          users: DS.hasMany(App.User),
          owner: DS.belongsTo(App.User),

          posts: DS.hasMany(App.Post),

          title: DS.attr('string')
        });

        var fields = Ember.get(App.Blog, 'fields');
        fields.forEach(function(field, kind) {
          console.log(field, kind);
        });

        // prints:
        // users, hasMany
        // owner, belongsTo
        // posts, hasMany
        // title, attribute

    @type Ember.Map
    @readOnly
  */
  fields: Ember.computed(function() {
    var map = Ember.Map.create(), type;

    this.eachComputedProperty(function(name, meta) {
      if (meta.isRelationship) {
        map.set(name, meta.kind);
      } else if (meta.isAttribute) {
        map.set(name, 'attribute');
      }
    });

    return map;
  }),

  /**
    Given a callback, iterates over each of the relationships in the model,
    invoking the callback with the name of each relationship and its relationship
    descriptor.

    @param {Function} callback the callback to invoke
    @param {any} binding the value to which the callback's `this` should be bound
  */
  eachRelationship: function(callback, binding) {
    get(this, 'relationshipsByName').forEach(function(name, relationship) {
      callback.call(binding, name, relationship);
    });
  },

  /**
    Given a callback, iterates over each of the types related to a model,
    invoking the callback with the related type's class. Each type will be
    returned just once, regardless of how many different relationships it has
    with a model.

    @param {Function} callback the callback to invoke
    @param {any} binding the value to which the callback's `this` should be bound
  */
  eachRelatedType: function(callback, binding) {
    get(this, 'relatedTypes').forEach(function(type) {
      callback.call(binding, type);
    });
  }
});

DS.Model.reopen({
  /**
    Given a callback, iterates over each of the relationships in the model,
    invoking the callback with the name of each relationship and its relationship
    descriptor.

    @param {Function} callback the callback to invoke
    @param {any} binding the value to which the callback's `this` should be bound
  */
  eachRelationship: function(callback, binding) {
    this.constructor.eachRelationship(callback, binding);
  }
});

/**
  @private

  Helper method to look up the name of the inverse of a relationship.

  In a has-many relationship, there are always two sides: the `belongsTo` side
  and the `hasMany` side. When one side changes, the other side should be updated
  automatically.

  Given a model, the model of the inverse, and the kind of the relationship, this
  helper returns the name of the relationship on the inverse.

  For example, imagine the following two associated models:

      App.Post = DS.Model.extend({
        comments: DS.hasMany('App.Comment')
      });

      App.Comment = DS.Model.extend({
        post: DS.belongsTo('App.Post')
      });

  If the `post` property of a `Comment` was modified, Ember Data would invoke
  this helper like this:

      DS._inverseNameFor(App.Comment, App.Post, 'hasMany');
      //=> 'comments'

  Ember Data uses the name of the relationship returned to reflect the changed
  relationship on the other side.
*/
DS._inverseRelationshipFor = function(modelType, inverseModelType) {
  var relationshipMap = get(modelType, 'relationships'),
      possibleRelationships = relationshipMap.get(inverseModelType),
      possible, actual, oldValue;

  if (!possibleRelationships) { return; }
  if (possibleRelationships.length > 1) { return; }
  return possibleRelationships[0];
};

/**
  @private

  Given a model and a relationship name, returns the model type of
  the named relationship.

      App.Post = DS.Model.extend({
        comments: DS.hasMany('App.Comment')
      });

      DS._inverseTypeFor(App.Post, 'comments');
      //=> App.Comment
  @param {DS.Model class} modelType
  @param {String} relationshipName
  @return {DS.Model class}
*/
DS._inverseTypeFor = function(modelType, relationshipName) {
  var relationships = get(modelType, 'relationshipsByName'),
      relationship = relationships.get(relationshipName);

  if (relationship) { return relationship.type; }
};
