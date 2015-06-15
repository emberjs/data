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

export default Ember.Object.extend({

  /*
    This is only to be used temporarily during the transition from the old
    serializer API to the new one.

    This makes the store and the built-in serializers use the new Serializer API.


    ## Custom Serializers

    If you have custom serializers you need to do the following:

    1. Opt-in to the new Serializer API by setting `isNewSerializerAPI` to `true`
        when extending one of the built-in serializers. This indicates that the
        store should call `normalizeResponse` instead of `extract` and to expect
        a JSON-API Document back.
    2. If you have a custom `extract` hooks you need to refactor it to the new
        `normalizeResponse` hooks and make sure it returns a JSON-API Document.
    3. If you have a custom `normalize` method you need to make sure it also
        returns a JSON-API Document with the record in question as the primary
        data.

    @property isNewSerializerAPI
  */
  isNewSerializerAPI: false,

  /**
    The `store` property is the application's `store` that contains all records.
    It's injected as a service.
    It can be used to push records from a non flat data structure server
    response.

    @property store
    @type {DS.Store}
    @public
  */

  /**
    The `extract` method is used to deserialize the payload received from your
    data source into the form that Ember Data expects.

    @method extract
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Object}
  */
  extract: null,

  /**
    The `serialize` method is used when a record is saved in order to convert
    the record into the form that your external data source expects.

    `serialize` takes an optional `options` hash with a single option:

    - `includeId`: If this is `true`, `serialize` should include the ID
      in the serialized object it builds.

    @method serialize
    @param {DS.Model} record
    @param {Object} [options]
    @return {Object}
  */
  serialize: null,

  /**
    The `normalize` method is used to convert a payload received from your
    external data source into the normalized form `store.push()` expects. You
    should override this method, munge the hash and return the normalized
    payload.

    @method normalize
    @param {DS.Model} typeClass
    @param {Object} hash
    @return {Object}
  */
  normalize: function(typeClass, hash) {
    return hash;
  }

});
