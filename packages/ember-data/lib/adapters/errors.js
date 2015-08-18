import ArrayPolyfills  from 'ember-data/ext/ember/array';
var forEach = ArrayPolyfills.forEach;

const EmberError = Ember.Error;
const create = Object.create || Ember.create;


const SOURCE_POINTER_REGEXP = /data\/(attributes|relationships)\/(.*)/;

/**
  @class AdapterError
  @namespace DS
*/
export function AdapterError(errors, message) {
  message = message || "Adapter operation failed";

  EmberError.call(this, message);

  this.errors = errors || [
    {
      title: "Adapter Error",
      details: message
    }
  ];
}

AdapterError.prototype = create(EmberError.prototype);

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
  a valid json-api error object with a `source/pointer` that matches
  the property name. For example if you had a Post model that
  looked like this.

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
      return Ember.RSVP.reject(new DS.InvalidError([
        {
          details: 'Must be unique',
          source: { pointer: 'data/attributes/title' }
        },
        {
          details: 'Must not be blank',
          source: { pointer: 'data/attributes/content'}
        }
      ]));
    }
  });
  ```

  Your backend may use different property names for your records the
  store will attempt extract and normalize the errors using the
  serializer's `extractErrors` method before the errors get added to
  the the model. As a result, it is safe for the `InvalidError` to
  wrap the error payload unaltered.

  @class InvalidError
  @namespace DS
*/
export function InvalidError(errors) {
  if (!Ember.isArray(errors)) {
    Ember.deprecate("`InvalidError` expects json-api formatted errors.");
    errors = errorsHashToArray(errors);
  }
  AdapterError.call(this, errors, "The adapter rejected the commit because it was invalid");
}

InvalidError.prototype = create(AdapterError.prototype);

/**
  @class TimeoutError
  @namespace DS
*/
export function TimeoutError() {
  AdapterError.call(this, null, "The adapter operation timed out");
}

TimeoutError.prototype = create(AdapterError.prototype);

/**
  @class AbortError
  @namespace DS
*/
export function AbortError() {
  AdapterError.call(this, null, "The adapter operation was aborted");
}

AbortError.prototype = create(AdapterError.prototype);

/**
  @private
*/
export function errorsHashToArray(errors) {
  let out = [];

  if (Ember.isPresent(errors)) {
    forEach.call(Ember.keys(errors), function(key) {
      let messages = Ember.makeArray(errors[key]);
      for (let i = 0; i < messages.length; i++) {
        out.push({
          title: 'Invalid Attribute',
          details: messages[i],
          source: {
            pointer: `data/attributes/${key}`
          }
        });
      }
    });
  }

  return out;
}

export function errorsArrayToHash(errors) {
  let out = {};

  if (Ember.isPresent(errors)) {
    forEach.call(errors, function(error) {
      if (error.source && error.source.pointer) {
        let key = error.source.pointer.match(SOURCE_POINTER_REGEXP);

        if (key) {
          key = key[2];
          out[key] = out[key] || [];
          out[key].push(error.details || error.title);
        }
      }
    });
  }

  return out;
}
