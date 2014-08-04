var get = Ember.get;
var set = Ember.set;
var isNone = Ember.isNone;
var Promise = Ember.RSVP.Promise;

import { Model } from 'ember-data/system/model';
import { PromiseObject } from 'ember-data/system/store';
import { RelationshipChange } from 'ember-data/system/changes';
import {
  relationshipFromMeta,
  typeForRelationshipMeta,
  isSyncRelationship
} from 'ember-data/system/relationship-meta';

/**
  @module ember-data
*/

function asyncBelongsTo(type, options, meta) {
  return Ember.computed('data', function(key, value) {
    var data = get(this, 'data');
    var store = get(this, 'store');
    var promiseLabel = "DS: Async belongsTo " + this + " : " + key;
    var promise;

    meta.key = key;

    if (arguments.length === 2) {
      Ember.assert("You can only add a '" + type + "' record to this relationship", !value || value instanceof typeForRelationshipMeta(store, meta));
      return value === undefined ? null : PromiseObject.create({
        promise: Promise.cast(value, promiseLabel)
      });
    }

    var link = data.links && data.links[key];
    var belongsTo = data[key];

    if (!isNone(belongsTo)) {
      var inverse = this.constructor.inverseFor(key);
      //but for now only in the oneToOne case
      if (inverse && inverse.kind === 'belongsTo'){
        set(belongsTo, inverse.name, this);
      }
      //TODO(Igor) after OR doesn't seem that will be called
      promise = store.findById(belongsTo.constructor, belongsTo.get('id')) || Promise.cast(belongsTo, promiseLabel);
      return PromiseObject.create({
        promise: promise
      });
    } else if (link) {
      promise = store.findBelongsTo(this, link, relationshipFromMeta(store, meta));
      return PromiseObject.create({
        promise: promise
      });
    } else {
      return null;
    }
  }).meta(meta);
}

/**
  `DS.belongsTo` is used to define One-To-One and One-To-Many
  relationships on a [DS.Model](/api/data/classes/DS.Model.html).


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
function belongsTo(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  } else {
    Ember.assert("The first argument to DS.belongsTo must be a string representing a model type key, e.g. use DS.belongsTo('person') to define a relation to the App.Person model", !!type && (typeof type === 'string' || Model.detect(type)));
  }

  options = options || {};

  var meta = {
    type: type,
    isRelationship: true,
    options: options,
    kind: 'belongsTo',
    key: null
  };

  if (options.async) {
    return asyncBelongsTo(type, options, meta);
  }

  return Ember.computed('data', function(key, value) {
    var data = get(this, 'data');
    var store = get(this, 'store');
    var belongsTo, typeClass;

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

    store.findById(belongsTo.constructor, belongsTo.get('id'));

    return belongsTo;
  }).meta(meta);
}

/**
  These observers observe all `belongsTo` relationships on the record. See
  `relationships/ext` to see how these observers get their dependencies.

  @class Model
  @namespace DS
*/
Model.reopen({

  /**
    @method belongsToWillChange
    @private
    @static
    @param record
    @param key
  */
  belongsToWillChange: Ember.beforeObserver(function(record, key) {
    if (get(record, 'isLoaded') && isSyncRelationship(record, key)) {
      var oldParent = get(record, key);

      if (oldParent) {
        var store = get(record, 'store');
        var change = RelationshipChange.createChange(record, oldParent, store, {
          key: key,
          kind: 'belongsTo',
          changeType: 'remove'
        });

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
        var store = get(record, 'store');
        var change = RelationshipChange.createChange(record, newParent, store, {
          key: key,
          kind: 'belongsTo',
          changeType: 'add'
        });

        change.sync();
      }
    }

    delete this._changesToSync[key];
  })
});

export default belongsTo;
