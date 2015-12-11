import Ember from 'ember';
var EmberError = Ember.Error;

/**
  A `DS.InvalidError` is used by an adapter to signal the external API
  was unable to process a request because the content was not
  semantically correct or meaningful per the API. Usually this means a
  record failed some form of server side validation. When a promise
  from an adapter is rejected with a `DS.InvalidError` the record will
  transition to the `invalid` state and the errors will be set to the
  `errors` property on the record.

  For Ember Data to correctly map errors to their corresponding
  properties on the model, Ember Data expects each error to be
  namespaced under a key that matches the property name. For example
  if you had a Post model that looked like this.

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    title: DS.attr('string'),
    content: DS.attr('string')
  });
  ```

  To show an error from the server related to the `title` and
  `content` properties your adapter could return a promise that
  rejects with a `DS.InvalidError` object that looks like this:

  ```app/adapters/post.js
  import Ember from 'ember';
  import DS from 'ember-data';

  export default DS.RESTAdapter.extend({
    updateRecord: function() {
      // Fictional adapter that always rejects
      return Ember.RSVP.reject(new DS.InvalidError({
        title: ['Must be unique'],
        content: ['Must not be blank'],
      }));
    }
  });
  ```

  Your backend may use different property names for your records the
  store will attempt extract and normalize the errors using the
  serializer's `extractErrors` method before the errors get added to
  the the model. As a result, it is safe for the `InvalidError` to
  wrap the error payload unaltered.

  Example

  ```app/adapters/application.js
  import Ember from 'ember';
  import DS from 'ember-data';

  export default DS.RESTAdapter.extend({
    ajaxError: function(jqXHR) {
      var error = this._super(jqXHR);

      // 422 is used by this fictional server to signal a validation error
      if (jqXHR && jqXHR.status === 422) {
        var jsonErrors = Ember.$.parseJSON(jqXHR.responseText);
        return new DS.InvalidError(jsonErrors);
      } else {
        // The ajax request failed however it is not a result of this
        // record being in an invalid state so we do not return a
        // `InvalidError` object.
        return error;
      }
    }
  });
  ```

  @class InvalidError
  @namespace DS
*/
export default function InvalidError(errors) {
  EmberError.call(this, "The backend rejected the commit because it was invalid: " + Ember.inspect(errors));
  this.errors = errors;
}

InvalidError.prototype = Object.create(EmberError.prototype);
