/**
  @module ember-data
*/

/**
  `DS.Serializer` is an abstract base class that you should override in your
  application to customize it for your backend. The minimum set of methods
  that you should implement is:

    * `extract()`
    * `serialize()`

  And you can optionally override the following methods:

    * `normalize()`

  For an example implementation, see
  [DS.JSONSerializer](DS.JSONSerializer.html), the included JSON serializer.

  @class Serializer
  @namespace DS
  @extends Ember.Object
*/

var Serializer = Ember.Object.extend({

  /**
    The `extract` method is used to deserialize the payload received from your
    data source into the form that Ember Data expects.

    @method extract
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object}
  */
  extract: Ember.required(Function),

  /**
    The `serialize` method is used when a record is saved in order to convert
    the record into the form that your external data source expects.

    `serialize` takes an optional `options` hash with a single option:

    - `includeId`: If this is `true`, `serialize` should include the ID
      in the serialized object it builds.

    @method serialize
    @param {subclass of DS.Model} record
    @param {Object} [options]
    @return {Object}
  */
  serialize: Ember.required(Function),

  /**
    The `normalize` method is used to convert a payload received from your
    external data source into the normalized form `store.push()` expects. You
    should override this method, munge the hash and return the normalized
    payload.

    @method normalize
    @param {subclass of DS.Model} type
    @param {Object} hash
    @return {Object}
  */
  normalize: function(type, hash) {
    return hash;
  }

});

export default Serializer;
