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

      // If it is, get the metadata for the association. This is
      // populated by the `DS.belongsTo` helper when it is creating
      // the computed property.
      var meta = value.meta();

      if (meta.isAssociation && meta.kind === 'belongsTo') {
        Ember.addObserver(proto, key, null, 'belongsToDidChange');
        Ember.addBeforeObserver(proto, key, null, 'belongsToWillChange');
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

    Calling `App.Post.typeForAssociation('comments')` will return `App.Comment`.

    @param {String} name the name of the association
    @return {subclass of DS.Model} the type of the association, or undefined
  */
  typeForAssociation: function(name) {
    var association = get(this, 'associationsByName').get(name);
    return association && association.type;
  },

  /**
    The model's associations as a map, keyed on the type of the
    association. The value of each entry is an array containing a descriptor
    for each association with that type, describing the name of the association
    as well as the type.

    For example, given the following model definition:

        App.Blog = DS.Model.extend({
          users: DS.hasMany(App.User),
          owner: DS.belongsTo(App.User),

          posts: DS.hasMany(App.Post)
        });

    This computed property would return a map describing these
    associations, like this:

        var associations = Ember.get(App.Blog, 'associations');
        associatons.get(App.User);
        //=> [ { name: 'users', kind: 'hasMany' },
        //     { name: 'owner', kind: 'belongsTo' } ]
        associations.get(App.Post);
        //=> [ { name: 'posts', kind: 'hasMany' } ]

    @type Ember.Map
    @readOnly
  */
  associations: Ember.computed(function() {
    var map = new Ember.MapWithDefault({
      defaultValue: function() { return []; }
    });

    // Loop through each computed property on the class
    this.eachComputedProperty(function(name, meta) {

      // If the computed property is an association, add
      // it to the map.
      if (meta.isAssociation) {
        if (typeof meta.type === 'string') {
          meta.type = Ember.get(Ember.lookup, meta.type);
        }

        var associationsForType = map.get(meta.type);

        associationsForType.push({ name: name, kind: meta.kind });
      }
    });

    return map;
  }),

  /**
    A hash containing lists of the model's associations, grouped
    by the association kind. For example, given a model with this
    definition:

        App.Blog = DS.Model.extend({
          users: DS.hasMany(App.User),
          owner: DS.belongsTo(App.User),

          posts: DS.hasMany(App.Post)
        });

    This property would contain the following:

       var associationNames = Ember.get(App.Blog, 'associationNames');
       associationNames.hasMany;
       //=> ['users', 'posts']
       associationNames.belongsTo;
       //=> ['owner']

    @type Object
    @readOnly
  */
  associationNames: Ember.computed(function() {
    var names = { hasMany: [], belongsTo: [] };

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAssociation) {
        names[meta.kind].push(name);
      }
    });

    return names;
  }),

  /**
    A map whose keys are the associations of a model and whose values are
    association descriptors.

    For example, given a model with this
    definition:

        App.Blog = DS.Model.extend({
          users: DS.hasMany(App.User),
          owner: DS.belongsTo(App.User),

          posts: DS.hasMany(App.Post)
        });

    This property would contain the following:

       var associationsByName = Ember.get(App.Blog, 'associationsByName');
       associationsByName.get('users');
       //=> { key: 'users', kind: 'hasMany', type: App.User }
       associationsByName.get('owner');
       //=> { key: 'owner', kind: 'belongsTo', type: App.User }

    @type Ember.Map
    @readOnly
  */
  associationsByName: Ember.computed(function() {
    var map = Ember.Map.create(), type;

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAssociation) {
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
      if (meta.isAssociation) {
        map.set(name, meta.kind);
      } else if (meta.isAttribute) {
        map.set(name, 'attribute');
      }
    });

    return map;
  }),

  /**
    Given a callback, iterates over each of the associations in the model,
    invoking the callback with the name of each association and its association
    descriptor.

    @param {Function} callback the callback to invoke
    @param {any} binding the value to which the callback's `this` should be bound
  */
  eachAssociation: function(callback, binding) {
    get(this, 'associationsByName').forEach(function(name, association) {
      callback.call(binding, name, association);
    });
  }
});

DS.Model.reopen({
  /**
    Given a callback, iterates over each of the associations in the model,
    invoking the callback with the name of each association and its association
    descriptor.

    @param {Function} callback the callback to invoke
    @param {any} binding the value to which the callback's `this` should be bound
  */
  eachAssociation: function(callback, binding) {
    this.constructor.eachAssociation(callback, binding);
  }
});

/**
  @private

  Helper method to look up the name of the inverse of an association.

  In a has-many relationship, there are always two sides: the `belongsTo` side
  and the `hasMany` side. When one side changes, the other side should be updated
  automatically.

  Given a model, the model of the inverse, and the kind of the association, this
  helper returns the name of the association on the inverse.

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

  Ember Data uses the name of the association returned to reflect the changed
  relationship on the other side.
*/
DS._inverseNameFor = function(modelType, inverseModelType, inverseAssociationKind) {
  var associationMap = get(modelType, 'associations'),
      possibleAssociations = associationMap.get(inverseModelType),
      possible, actual, oldValue;

  if (!possibleAssociations) { return; }

  for (var i = 0, l = possibleAssociations.length; i < l; i++) {
    possible = possibleAssociations[i];

    if (possible.kind === inverseAssociationKind) {
      actual = possible;
      break;
    }
  }

  if (actual) { return actual.name; }
};

/**
  @private

  Given a model and an association name, returns the model type of
  the named association.

      App.Post = DS.Model.extend({
        comments: DS.hasMany('App.Comment')
      });

      DS._inverseTypeFor(App.Post, 'comments');
      //=> App.Comment
  @param {DS.Model class} modelType
  @param {String} associationName
  @return {DS.Model class}
*/
DS._inverseTypeFor = function(modelType, associationName) {
  var associations = get(modelType, 'associationsByName'),
      association = associations.get(associationName);

  if (association) { return association.type; }
};
