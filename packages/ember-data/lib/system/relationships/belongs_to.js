var get = Ember.get, set = Ember.set,
    isNone = Ember.isNone;

var Promise = Ember.RSVP.Promise;

import {Model} from "../model";
import {PromiseObject} from "../store";

/**
  @module ember-data
*/

function asyncBelongsTo(type, options, meta) {
  return Ember.computed('data', function(key, value) {
    var data = get(this, 'data'),
        store = get(this, 'store'),
        promiseLabel = "DS: Async belongsTo " + this + " : " + key,
        promise;

    if (arguments.length === 2) {
      Ember.assert("You can only add a '" + type + "' record to this relationship", !value || value instanceof store.modelFor(type));
      return value === undefined ? null : PromiseObject.create({
        promise: Promise.cast(value, promiseLabel)
      });
    }

    var link = data.links && data.links[key],
        belongsTo = data[key];

    if(!isNone(belongsTo)) {
      promise = store.fetchRecord(belongsTo) || Promise.cast(belongsTo, promiseLabel);
      return PromiseObject.create({
        promise: promise
      });
    } else if (link) {
      promise = store.findBelongsTo(this, link, meta);
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
  var meta = {
    isRelationship: true,
    type: type,
    kind: 'belongsTo',
    options: options || {}
  };

  return Ember.computed(function(key, value) {
    if (arguments.length>1) {
      //TODO(Igor) bring back the assert
      //Ember.assert("You can only add a '" + type + "' record to this relationship", !value || value instanceof typeClass);
      var inverseKey = this.inverseFor(key).name;
      if(this._relationships[key]){
        this._relationships[key].removeRecord(this);
      }
      if (value){
        this._relationships[key] = value._relationships[inverseKey];
        this._relationships[key].addRecord(this);
      }
      return;
    }

    if (this._relationships[key]) {
      return this._relationships[key].getOtherSideFor(this);
    }

    return null;
  }).meta(meta);
}

Model.reopen({
  notifyBelongsToAdded: function(key, relationship) {
    this._relationships[key] = relationship;
    this.notifyPropertyChange(key);
  },

  notifyBelongsToRemoved: function(key) {
    this._relationships[key] = null;
    this.notifyPropertyChange(key);
  }
});

export default belongsTo;
