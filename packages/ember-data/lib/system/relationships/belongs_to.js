var get = Ember.get, set = Ember.set, setProperties = Ember.setProperties, isNone = Ember.isNone;

/**
  @module ember-data
*/

function asyncBelongsTo(type, options, meta) {
  return Ember.computed(function (key, value) {
    var data = get(this, 'data'),
        store = get(this, 'store'),
        promiseLabel = "DS: Async belongsTo " + this + " : " + key;

    if (arguments.length > 1) {
      Ember.assert("You can only add a '" + type + "' record to this relationship", !value || value instanceof store.modelFor(type));

      var oldValue = this._relationships[key] ||/* this._inFlightRelationships[key] ||*/ this._data[key];

      this.send('didSetProperty', {
        meta: meta,
        name: key,
        oldValue: oldValue && typeof oldValue.then === 'function' ? get(oldValue, 'content') : oldValue,
        originalValue: data[key],
        value: value
      });

      return this._relationships[key] = (value === undefined || value === null ? null : DS.PromiseObject.create({ promise: Ember.RSVP.resolve(value, promiseLabel) }));
    }

    var link = data.links && data.links[key],
        record = data[key],
        promise;

    if (!isNone(record)) {
      promise = DS.PromiseObject.create({ promise: store.fetchRecord(record) || Ember.RSVP.resolve(record, promiseLabel)});
    } else if (link) {
      var deferred = Ember.RSVP.defer("DS: Async belongsTo (link) " + this + " : " + key);
      store.findBelongsTo(this, link, meta, deferred);
      promise = DS.PromiseObject.create({ promise: deferred.promise });
    } else {
      promise = null;
    }
    return this._relationships[key] = promise;
  }).property('data').meta(meta);
}

function belongsTo(type, options, meta) {
  return Ember.computed(function (key, value) {
    var data = get(this, 'data'),
        store = get(this, 'store');

    if (arguments.length > 1) {
      value = (value === undefined ? null : value);

      Ember.assert("You can only add a '" + type + "' record to this relationship", !value || value instanceof store.modelFor(type));

      var oldValue = this._relationships[key] || /* this._inFlightRelationships[key] ||*/ this._data[key];
      this.send('didSetProperty', {
        meta: meta,
        name: key,
        oldValue: oldValue,
        originalValue: data[key],
        value: value
      });
      return this._relationships[key] = value;
    }

    var record = data[key];
    if (isNone(record)) { return null; }
    store.fetchRecord(record);
    return this._relationships[key] = record;
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
  return belongsTo(type, options, meta);
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
      var oldParent = get(record, key),
          changesToSync = this._changesToSync;

      if (isThenable(oldParent)) {
        oldParent.then(function (resolved) {
          change('remove', record, key, resolved, changesToSync);
        });
      } else {
        change('remove', record, key, oldParent, changesToSync);
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

      if (isThenable(newParent)) {
        newParent.then(function(resolved) {
          change('add', record, key, resolved);
        });
      } else {
        change('add', record, key, newParent);
      }
    }

    delete this._changesToSync[key];
  })
});

function change(changeType, record, key, parent, changesToSync) {
  if (parent) {
    DS.RelationshipChange.createChange(record, parent, get(record, 'store'), {
      key: key, kind: "belongsTo", changeType: changeType
    }).sync();

    if (changesToSync) { changesToSync[key] = change; }
  }
}

function isThenable(object) {
  return object && typeof object.then === 'function';
}
