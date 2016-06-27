/**
  @module ember-data
*/

import Ember from 'ember';

/**
  `DS.Serializer` is an abstract base class that you should override in your
  application to customize it for your backend. The minimum set of methods
  that you should implement is:

    * `normalizeResponse()`
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
    The `normalizeResponse` method is used to normalize a payload from the
    server to a JSON-API Document.

    http://jsonapi.org/format/#document-structure

    @since 1.13.0
    @method normalizeResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeResponse: null,

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
  normalize(typeClass, hash) {
    return hash;
  }

});
