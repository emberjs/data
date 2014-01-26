import {RESTAdapter} from "../../../ember-data/lib/adapters";
import {InvalidError} from "../../../ember-data/lib/system/adapter";
import {pluralize} from "../../../ember-inflector/lib/main";
import ActiveModelSerializer from "./active_model_serializer";
import EmbeddedRecordsMixin from "./embedded_records_mixin";

/**
  @module ember-data
*/

var forEach = Ember.EnumerableUtils.forEach;
var decamelize = Ember.String.decamelize,
    underscore = Ember.String.underscore;

/**
  The ActiveModelAdapter is a subclass of the RESTAdapter designed to integrate
  with a JSON API that uses an underscored naming convention instead of camelcasing.
  It has been designed to work out of the box with the
  [active_model_serializers](http://github.com/rails-api/active_model_serializers)
  Ruby gem.

  This adapter extends the DS.RESTAdapter by making consistent use of the camelization,
  decamelization and pluralization methods to normalize the serialized JSON into a
  format that is compatible with a conventional Rails backend and Ember Data.

  ## JSON Structure

  The ActiveModelAdapter expects the JSON returned from your server to follow
  the REST adapter conventions substituting underscored keys for camelcased ones.

  ### Conventional Names

  Attribute names in your JSON payload should be the underscored versions of
  the attributes in your Ember.js models.

  For example, if you have a `Person` model:

  ```js
  App.FamousPerson = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),
    occupation: DS.attr('string')
  });
  ```

  The JSON returned should look like this:

  ```js
  {
    "famous_person": {
      "first_name": "Barack",
      "last_name": "Obama",
      "occupation": "President"
    }
  }
  ```

  @class ActiveModelAdapter
  @constructor
  @namespace DS
  @extends DS.Adapter
**/

var ActiveModelAdapter = RESTAdapter.extend({
  defaultSerializer: '-active-model',
  /**
    The ActiveModelAdapter overrides the `pathForType` method to build
    underscored URLs by decamelizing and pluralizing the object type name.

    ```js
      this.pathForType("famousPerson");
      //=> "famous_people"
    ```

    @method pathForType
    @param {String} type
    @returns String
  */
  pathForType: function(type) {
    var decamelized = decamelize(type);
    var underscored = underscore(decamelized);
    return pluralize(underscored);
  },

  /**
    The ActiveModelAdapter overrides the `ajaxError` method
    to return a DS.InvalidError for all 422 Unprocessable Entity
    responses.

    A 422 HTTP response from the server generally implies that the request
    was well formed but the API was unable to process it because the
    content was not semantically correct or meaningful per the API.

    For more information on 422 HTTP Error code see 11.2 WebDAV RFC 4918
    https://tools.ietf.org/html/rfc4918#section-11.2

    @method ajaxError
    @param jqXHR
    @returns error
  */
  ajaxError: function(jqXHR) {
    var error = this._super(jqXHR);

    if (jqXHR && jqXHR.status === 422) {
      var response = Ember.$.parseJSON(jqXHR.responseText),
          errors = {};

      if (response.errors !== undefined) {
        var jsonErrors = response.errors;

        forEach(Ember.keys(jsonErrors), function(key) {
          errors[Ember.String.camelize(key)] = jsonErrors[key];
        });
      }

      return new InvalidError(errors);
    } else {
      return error;
    }
  }
});

export default ActiveModelAdapter;
