import Ember from 'ember';
import {assert} from 'ember-data/-private/debug';
import isEnabled from "ember-data/-private/features";

const EmberError = Ember.Error;

const SOURCE_POINTER_REGEXP = /^\/?data\/(attributes|relationships)\/(.*)/;
const SOURCE_POINTER_PRIMARY_REGEXP = /^\/?data/;
const PRIMARY_ATTRIBUTE_KEY = 'base';

/**
  @class AdapterError
  @namespace DS
*/
export function AdapterError(errors, message = 'Adapter operation failed') {
  this.isAdapterError = true;
  EmberError.call(this, message);

  this.errors = errors || [
    {
      title: 'Adapter Error',
      detail: message
    }
  ];
}

let extendedErrorsEnabled = false;
if (isEnabled('ds-extended-errors')) {
  extendedErrorsEnabled = true;
}

function extendFn(ErrorClass) {
  return function({ message: defaultMessage } = {}) {
    return extend(ErrorClass, defaultMessage);
  };
}

function extend(ParentErrorClass, defaultMessage) {
  let ErrorClass = function(errors, message) {
    assert('`AdapterError` expects json-api formatted errors array.', Array.isArray(errors || []));
    ParentErrorClass.call(this, errors, message || defaultMessage);
  };
  ErrorClass.prototype = Object.create(ParentErrorClass.prototype);

  if (extendedErrorsEnabled) {
    ErrorClass.extend = extendFn(ErrorClass);
  }

  return ErrorClass;
}

AdapterError.prototype = Object.create(EmberError.prototype);

if (extendedErrorsEnabled) {
  AdapterError.extend = extendFn(AdapterError);
}

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
export const InvalidError = extend(AdapterError,
  'The adapter rejected the commit because it was invalid');

/**
  @class TimeoutError
  @namespace DS
*/
export const TimeoutError = extend(AdapterError,
  'The adapter operation timed out');

/**
  @class AbortError
  @namespace DS
*/
export const AbortError = extend(AdapterError,
  'The adapter operation was aborted');

/**
  @class UnauthorizedError
  @namespace DS
*/
export const UnauthorizedError = extendedErrorsEnabled ?
  extend(AdapterError, 'The adapter operation is unauthorized') : null;

/**
  @class ForbiddenError
  @namespace DS
*/
export const ForbiddenError = extendedErrorsEnabled ?
  extend(AdapterError, 'The adapter operation is forbidden') : null;

/**
  @class NotFoundError
  @namespace DS
*/
export const NotFoundError = extendedErrorsEnabled ?
  extend(AdapterError, 'The adapter could not find the resource') : null;

/**
  @class ConflictError
  @namespace DS
*/
export const ConflictError = extendedErrorsEnabled ?
  extend(AdapterError, 'The adapter operation failed due to a conflict') : null;

/**
  @class ServerError
  @namespace DS
*/
export const ServerError = extendedErrorsEnabled ?
  extend(AdapterError, 'The adapter operation failed due to a server error') : null;

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
