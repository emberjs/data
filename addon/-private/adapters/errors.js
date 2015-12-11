import Ember from 'ember';
import {assert} from 'ember-data/-private/debug';

const EmberError = Ember.Error;

const SOURCE_POINTER_REGEXP = /^\/?data\/(attributes|relationships)\/(.*)/;
const SOURCE_POINTER_PRIMARY_REGEXP = /^\/?data/;
const PRIMARY_ATTRIBUTE_KEY = 'base';

/**
  @class AdapterError
  @namespace DS
*/
export function AdapterError(errors, message = 'Adapter operation failed') {
  EmberError.call(this, message);

  this.errors = errors || [
    {
      title: 'Adapter Error',
      detail: message
    }
  ];
}

AdapterError.prototype = Object.create(EmberError.prototype);

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
          detail: 'Must be unique',
          source: { pointer: '/data/attributes/title' }
        },
        {
          detail: 'Must not be blank',
          source: { pointer: '/data/attributes/content'}
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
  assert('`InvalidError` expects json-api formatted errors array.', Ember.isArray(errors || []));
  AdapterError.call(this, errors, 'The adapter rejected the commit because it was invalid');
}

InvalidError.prototype = Object.create(AdapterError.prototype);

/**
  @class TimeoutError
  @namespace DS
*/
export function TimeoutError() {
  AdapterError.call(this, null, 'The adapter operation timed out');
}

TimeoutError.prototype = Object.create(AdapterError.prototype);

/**
  @class AbortError
  @namespace DS
*/
export function AbortError() {
  AdapterError.call(this, null, 'The adapter operation was aborted');
}

AbortError.prototype = Object.create(AdapterError.prototype);

/**
  @method errorsHashToArray
  @private
*/
export function errorsHashToArray(errors) {
  let out = [];

  if (Ember.isPresent(errors)) {
    Object.keys(errors).forEach((key) => {
      let messages = Ember.makeArray(errors[key]);
      for (let i = 0; i < messages.length; i++) {
        let title = 'Invalid Attribute';
        let pointer = `/data/attributes/${key}`;
        if (key === PRIMARY_ATTRIBUTE_KEY) {
          title = 'Invalid Document';
          pointer = `/data`;
        }
        out.push({
          title: title,
          detail: messages[i],
          source: {
            pointer: pointer
          }
        });
      }
    });
  }

  return out;
}

/**
  @method errorsArrayToHash
  @private
*/
export function errorsArrayToHash(errors) {
  let out = {};

  if (Ember.isPresent(errors)) {
    errors.forEach((error) => {
      if (error.source && error.source.pointer) {
        let key = error.source.pointer.match(SOURCE_POINTER_REGEXP);

        if (key) {
          key = key[2];
        } else if (error.source.pointer.search(SOURCE_POINTER_PRIMARY_REGEXP) !== -1) {
          key = PRIMARY_ATTRIBUTE_KEY;
        }

        if (key) {
          out[key] = out[key] || [];
          out[key].push(error.detail || error.title);
        }
      }
    });
  }

  return out;
}
