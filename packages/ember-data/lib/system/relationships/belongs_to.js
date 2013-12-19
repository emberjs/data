var get = Ember.get, set = Ember.set,
    isNone = Ember.isNone;

/**
  @module ember-data
*/

function asyncBelongsTo(type, options, meta) {
  return Ember.computed(function(key, value) {
    var data = get(this, 'data'),
        store = get(this, 'store'),
        promiseLabel = "DS: Async belongsTo " + this + " : " + key;

    if (arguments.length === 2) {
      Ember.assert("You can only add a '" + type + "' record to this relationship", !value || value instanceof store.modelFor(type));
      return value === undefined ? null : DS.PromiseObject.create({ promise: Ember.RSVP.resolve(value, promiseLabel) });
    }

    var link = data.links && data.links[key],
        belongsTo = data[key];

    if(!isNone(belongsTo)) {
      var promise = store.fetchRecord(belongsTo) || Ember.RSVP.resolve(belongsTo, promiseLabel);
      return DS.PromiseObject.create({ promise: promise});
    } else if (link) {
      var resolver = Ember.RSVP.defer("DS: Async belongsTo (link) " + this + " : " + key);
      store.findBelongsTo(this, link, meta, resolver);
      return DS.PromiseObject.create({ promise: resolver.promise });
    } else {
      return null;
    }
  }).property('data').meta(meta);
}

/**
  `DS.belongsTo` is used to define One-To-One and One-To-Many
  relationships on a [DS.Model](DS.Model.html).


  `DS.belongsTo` takes an optional hash as a second parameter, currently
  supported options are:

  - `async`: A boolean value used to explicitly declare this to be an async relationship.
  - `inverse`: A string used to identify the inverse property on a
    related model in a One-To-Many relationship. See [Explicit Inverses](#toc_explicit-inverses)

  #### One-To-One
  To declare a one-to-one relationship between two models, use
  `DS.belongsTo`:

  ```javascript
  App.User = DS.Model.extend({
    profile: DS.belongsTo('profile')
  });

  App.Profile = DS.Model.extend({
    user: DS.belongsTo('user')
  });
  ```

  #### One-To-Many
  To declare a one-to-many relationship between two models, use
  `DS.belongsTo` in combination with `DS.hasMany`, like this:

  ```javascript
  App.Post = DS.Model.extend({
    comments: DS.hasMany('comment')
  });

  App.Comment = DS.Model.extend({
    post: DS.belongsTo('post')
  });
  ```

  @namespace
  @method belongsTo
  @for DS
  @param {String or DS.Model} type the model type of the relationship
  @param {Object} options a hash of options
  @return {Ember.computed} relationship
*/
DS.belongsTo = function(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  } else {
    Ember.assert("The first argument DS.belongsTo must be a model type or string, like DS.belongsTo(App.Person)", !!type && (typeof type === 'string' || DS.Model.detect(type)));
  }

  options = options || {};

  var meta = { type: type, isRelationship: true, options: options, kind: 'belongsTo' };

  if (options.async) {
    return asyncBelongsTo(type, options, meta);
  }

  return Ember.computed(function(key, value) {
    var data = get(this, 'data'),
        store = get(this, 'store'), belongsTo, typeClass;

    if (typeof type === 'string') {
      typeClass = store.modelFor(type);
    } else {
      typeClass = type;
    }

    if (arguments.length === 2) {
      Ember.assert("You can only add a '" + type + "' record to this relationship", !value || value instanceof typeClass);
      return value === undefined ? null : value;
    }

    belongsTo = data[key];

    if (isNone(belongsTo)) { return null; }

    store.fetchRecord(belongsTo);

    return belongsTo;
  }).property('data').meta(meta);
};

/**
  These observers observe all `belongsTo` relationships on the record. See
  `relationships/ext` to see how these observers get their dependencies.

  @class Model
  @namespace DS
*/
DS.Model.reopen({

  /**
    @method belongsToWillChange
    @private
    @static
    @param record
    @param key
  */
  belongsToWillChange: Ember.beforeObserver(function(record, key) {
    if (get(record, 'isLoaded')) {
      var oldParent = get(record, key);

      if (oldParent) {
        var store = get(record, 'store'),
            change = DS.RelationshipChange.createChange(record, oldParent, store, { key: key, kind: "belongsTo", changeType: "remove" });

        change.sync();
        this._changesToSync[key] = change;
      }
    }
  }),

  /**
    @method belongsToDidChange
    @private
    @static
    @param record
    @param key
  */
  belongsToDidChange: Ember.immediateObserver(function(record, key) {
    if (get(record, 'isLoaded')) {
      var newParent = get(record, key);

      if (newParent) {
        var store = get(record, 'store'),
            change = DS.RelationshipChange.createChange(record, newParent, store, { key: key, kind: "belongsTo", changeType: "add" });

        change.sync();
      }
    }

    delete this._changesToSync[key];
  })
});
