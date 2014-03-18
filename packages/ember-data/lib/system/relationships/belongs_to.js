var get = Ember.get, set = Ember.set,
    isNone = Ember.isNone;

var Promise = Ember.RSVP.Promise;


/**
  @module ember-data
*/

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
  var meta = {
    isRelationship: true,
    type: type,
    kind: 'belongsTo',
    options: options || {}
  };

  return Ember.computed(function(key, value) {
    var promiseLabel = "DS: Async belongsTo " + this + " : " + key;

    if (arguments.length>1) {
      //TODO(Igor) bring back the assert
      //Ember.assert("You can only add a '" + type + "' record to this relationship", !value || value instanceof typeClass);
      if(this._relationships[key]){
        this._relationships[key].removeRecord(this);
      }

      if (value){
        this._relationships[key] = DS.createRelationshipFor(this, meta, this.store);

        var inverse = this.inverseFor(key);

        if(inverse){
          if(value._relationships[inverse.name]){
            this._relationships[key] = value._relationships[inverse.name];
          }
          else{
            //In this case the other record isn't on the relationship so we need to add it
            value._relationships[inverse.name] = this._relationships[key];
            this._relationships[key].addRecord(value, this);
          }
        }

        this._relationships[key].addRecord(this, value);
      }

      return DS.PromiseObject.create({
        promise: Promise.cast(value, promiseLabel)
      });
    }

    var record = null;

    if (this._relationships[key]) {
      record = this._relationships[key].getOtherSideFor(this);
    }
      //this should probably go to the store
    var promise = this.store.fetchRecord(record) || Promise.cast(record, promiseLabel);

    return DS.PromiseObject.create({
      promise: promise
    });

  }).meta(meta);
};

DS.Model.reopen({
  notifyBelongsToAdded: function(key, relationship) {
    this._relationships[key] = relationship;
    this.notifyPropertyChange(key);
  },

  notifyBelongsToRemoved: function(key) {
    this._relationships[key] = null;
    this.notifyPropertyChange(key);
  }
});
