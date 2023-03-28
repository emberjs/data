/**
  @module @ember-data/adapter/error
 */
import { assert, deprecate } from '@ember/debug';

import { DEPRECATE_HELPERS } from '@ember-data/private-build-infra/current-deprecations';

/**
  A `AdapterError` is used by an adapter to signal that an error occurred
  during a request to an external API. It indicates a generic error, and
  subclasses are used to indicate specific error states. The following
  subclasses are provided:

  - `InvalidError`
  - `TimeoutError`
  - `AbortError`
  - `UnauthorizedError`
  - `ForbiddenError`
  - `NotFoundError`
  - `ConflictError`
  - `ServerError`

  To create a custom error to signal a specific error state in communicating
  with an external API, extend the `AdapterError`. For example, if the
  external API exclusively used HTTP `503 Service Unavailable` to indicate
  it was closed for maintenance:

  ```app/adapters/maintenance-error.js
  import AdapterError from '@ember-data/adapter/error';

  export default AdapterError.extend({ message: "Down for maintenance." });
  ```

  This error would then be returned by an adapter's `handleResponse` method:

  ```app/adapters/application.js
  import JSONAPIAdapter from '@ember-data/adapter/json-api';
  import MaintenanceError from './maintenance-error';

  export default class ApplicationAdapter extends JSONAPIAdapter {
    handleResponse(status) {
      if (503 === status) {
        return new MaintenanceError();
      }

      return super.handleResponse(...arguments);
    }
  }
  ```

  And can then be detected in an application and used to send the user to an
  `under-maintenance` route:

  ```app/routes/application.js
  import Route from '@ember/routing/route';
  import MaintenanceError from '../adapters/maintenance-error';

  export default class ApplicationRoute extends Route {
    actions: {
      error(error, transition) {
        if (error instanceof MaintenanceError) {
          this.transitionTo('under-maintenance');
          return;
        }

        // ...other error handling logic
      }
    }
  }
  ```

  @main @ember-data/adapter/error
  @class AdapterError
  @public
*/
function AdapterError(errors, message = 'Adapter operation failed') {
  this.isAdapterError = true;
  let error = Error.call(this, message);

  if (error) {
    this.stack = error.stack;
    this.description = error.description;
    this.fileName = error.fileName;
    this.lineNumber = error.lineNumber;
    this.message = error.message;
    this.name = error.name;
    this.number = error.number;
  }

  this.errors = errors || [
    {
      title: 'Adapter Error',
      detail: message,
    },
  ];
}

export default AdapterError;

function extendFn(ErrorClass) {
  return function ({ message: defaultMessage } = {}) {
    return extend(ErrorClass, defaultMessage);
  };
}

function extend(ParentErrorClass, defaultMessage) {
  let ErrorClass = function (errors, message) {
    assert('`AdapterError` expects json-api formatted errors array.', Array.isArray(errors || []));
    ParentErrorClass.call(this, errors, message || defaultMessage);
  };
  ErrorClass.prototype = Object.create(ParentErrorClass.prototype);
  ErrorClass.extend = extendFn(ErrorClass);

  return ErrorClass;
}

AdapterError.prototype = Object.create(Error.prototype);
AdapterError.prototype.code = 'AdapterError';
AdapterError.extend = extendFn(AdapterError);

/**
  A `InvalidError` is used by an adapter to signal the external API
  was unable to process a request because the content was not
  semantically correct or meaningful per the API. Usually, this means a
  record failed some form of server-side validation. When a promise
  from an adapter is rejected with a `InvalidError` the record will
  transition to the `invalid` state and the errors will be set to the
  `errors` property on the record.

  For Ember Data to correctly map errors to their corresponding
  properties on the model, Ember Data expects each error to be
  a valid JSON-API error object with a `source/pointer` that matches
  the property name. For example, if you had a Post model that
  looked like this.

  ```app/models/post.js
  import Model, { attr } from '@ember-data/model';

  export default class PostModel extends Model {
    @attr('string') title;
    @attr('string') content;
  }
  ```

  To show an error from the server related to the `title` and
  `content` properties your adapter could return a promise that
  rejects with a `InvalidError` object that looks like this:

  ```app/adapters/post.js
  import RSVP from 'RSVP';
  import RESTAdapter from '@ember-data/adapter/rest';
  import { InvalidError } from '@ember-data/adapter/error';

  export default class ApplicationAdapter extends RESTAdapter {
    updateRecord() {
      // Fictional adapter that always rejects
      return RSVP.reject(new InvalidError([
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
  }
  ```

  Your backend may use different property names for your records the
  store will attempt to extract and normalize the errors using the
  serializer's `extractErrors` method before the errors get added to
  the model. As a result, it is safe for the `InvalidError` to
  wrap the error payload unaltered.

  @class InvalidError
  @public
  @extends AdapterError
*/
// TODO @deprecate extractError documentation
export const InvalidError = extend(AdapterError, 'The adapter rejected the commit because it was invalid');
InvalidError.prototype.code = 'InvalidError';

/**
  A `TimeoutError` is used by an adapter to signal that a request
  to the external API has timed out. I.e. no response was received from
  the external API within an allowed time period.

  An example use case would be to warn the user to check their internet
  connection if an adapter operation has timed out:

  ```app/routes/application.js
  import Route from '@ember/routing/route';
  import { TimeoutError } from '@ember-data/adapter/error';
  import { action } from '@ember/object';

  export default class ApplicationRoute extends Route {
    @action
    error(error, transition) {
      if (error instanceof TimeoutError) {
        // alert the user
        alert('Are you still connected to the Internet?');
        return;
      }

      // ...other error handling logic
    }
  }
  ```

  @class TimeoutError
  @public
  @extends AdapterError
*/
export const TimeoutError = extend(AdapterError, 'The adapter operation timed out');
TimeoutError.prototype.code = 'TimeoutError';

/**
  A `AbortError` is used by an adapter to signal that a request to
  the external API was aborted. For example, this can occur if the user
  navigates away from the current page after a request to the external API
  has been initiated but before a response has been received.

  @class AbortError
  @public
  @extends AdapterError
*/
export const AbortError = extend(AdapterError, 'The adapter operation was aborted');
AbortError.prototype.code = 'AbortError';

/**
  A `UnauthorizedError` equates to a HTTP `401 Unauthorized` response
  status. It is used by an adapter to signal that a request to the external
  API was rejected because authorization is required and has failed or has not
  yet been provided.

  An example use case would be to redirect the user to a login route if a
  request is unauthorized:

  ```app/routes/application.js
  import Route from '@ember/routing/route';
  import { UnauthorizedError } from '@ember-data/adapter/error';
  import { action } from '@ember/object';

  export default class ApplicationRoute extends Route {
    @action
    error(error, transition) {
      if (error instanceof UnauthorizedError) {
        // go to the login route
        this.transitionTo('login');
        return;
      }

      // ...other error handling logic
    }
  }
  ```

  @class UnauthorizedError
  @public
  @extends AdapterError
*/
export const UnauthorizedError = extend(AdapterError, 'The adapter operation is unauthorized');
UnauthorizedError.prototype.code = 'UnauthorizedError';

/**
  A `ForbiddenError` equates to a HTTP `403 Forbidden` response status.
  It is used by an adapter to signal that a request to the external API was
  valid but the server is refusing to respond to it. If authorization was
  provided and is valid, then the authenticated user does not have the
  necessary permissions for the request.

  @class ForbiddenError
  @public
  @extends AdapterError
*/
export const ForbiddenError = extend(AdapterError, 'The adapter operation is forbidden');
ForbiddenError.prototype.code = 'ForbiddenError';

/**
  A `NotFoundError` equates to a HTTP `404 Not Found` response status.
  It is used by an adapter to signal that a request to the external API
  was rejected because the resource could not be found on the API.

  An example use case would be to detect if the user has entered a route
  for a specific model that does not exist. For example:

  ```app/routes/post.js
  import Route from '@ember/routing/route';
  import { NotFoundError } from '@ember-data/adapter/error';
  import { inject as service } from '@ember/service';
  import { action } from '@ember/object';

  export default class PostRoute extends Route {
    @service store;
    model(params) {
      return this.store.findRecord('post', params.post_id);
    }
    @action
    error(error, transition) {
      if (error instanceof NotFoundError) {
        // redirect to a list of all posts instead
        this.transitionTo('posts');
      } else {
        // otherwise let the error bubble
        return true;
      }
    }
  }
  ```

  @class NotFoundError
  @public
  @extends AdapterError
*/
export const NotFoundError = extend(AdapterError, 'The adapter could not find the resource');
NotFoundError.prototype.code = 'NotFoundError';

/**
  A `ConflictError` equates to a HTTP `409 Conflict` response status.
  It is used by an adapter to indicate that the request could not be processed
  because of a conflict in the request. An example scenario would be when
  creating a record with a client-generated ID but that ID is already known
  to the external API.

  @class ConflictError
  @public
  @extends AdapterError
*/
export const ConflictError = extend(AdapterError, 'The adapter operation failed due to a conflict');
ConflictError.prototype.code = 'ConflictError';

/**
  A `ServerError` equates to a HTTP `500 Internal Server Error` response
  status. It is used by the adapter to indicate that a request has failed
  because of an error in the external API.

  @class ServerError
  @public
  @extends AdapterError
*/
export const ServerError = extend(AdapterError, 'The adapter operation failed due to a server error');
ServerError.prototype.code = 'ServerError';

function makeArray(value) {
  return Array.isArray(value) ? value : [value];
}

const SOURCE_POINTER_REGEXP = /^\/?data\/(attributes|relationships)\/(.*)/;
const SOURCE_POINTER_PRIMARY_REGEXP = /^\/?data/;
const PRIMARY_ATTRIBUTE_KEY = 'base';
/**
  Convert an hash of errors into an array with errors in JSON-API format.
   ```javascript
   import { errorsHashToArray } from '@ember-data/adapter/error';

   let errors = {
    base: 'Invalid attributes on saving this record',
    name: 'Must be present',
    age: ['Must be present', 'Must be a number']
  };
   let errorsArray = errorsHashToArray(errors);
  // [
  //   {
  //     title: "Invalid Document",
  //     detail: "Invalid attributes on saving this record",
  //     source: { pointer: "/data" }
  //   },
  //   {
  //     title: "Invalid Attribute",
  //     detail: "Must be present",
  //     source: { pointer: "/data/attributes/name" }
  //   },
  //   {
  //     title: "Invalid Attribute",
  //     detail: "Must be present",
  //     source: { pointer: "/data/attributes/age" }
  //   },
  //   {
  //     title: "Invalid Attribute",
  //     detail: "Must be a number",
  //     source: { pointer: "/data/attributes/age" }
  //   }
  // ]
  ```
  @method errorsHashToArray
  @for @ember-data/adapter/error
  @static
  @deprecated
  @public
  @param {Object} errors hash with errors as properties
  @return {Array} array of errors in JSON-API format
*/
export function errorsHashToArray(errors) {
  if (DEPRECATE_HELPERS) {
    deprecate(`errorsHashToArray helper has been deprecated.`, false, {
      id: 'ember-data:deprecate-errors-hash-to-array-helper',
      for: 'ember-data',
      until: '5.0',
      since: { available: '4.7', enabled: '4.7' },
    });
    let out = [];

    if (errors) {
      Object.keys(errors).forEach((key) => {
        let messages = makeArray(errors[key]);
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
              pointer: pointer,
            },
          });
        }
      });
    }

    return out;
  }
  assert(`errorsHashToArray helper has been removed`);
}

/**
  Convert an array of errors in JSON-API format into an object.

  ```javascript
  import { errorsArrayToHash } from '@ember-data/adapter/error';

  let errorsArray = [
    {
      title: 'Invalid Attribute',
      detail: 'Must be present',
      source: { pointer: '/data/attributes/name' }
    },
    {
      title: 'Invalid Attribute',
      detail: 'Must be present',
      source: { pointer: '/data/attributes/age' }
    },
    {
      title: 'Invalid Attribute',
      detail: 'Must be a number',
      source: { pointer: '/data/attributes/age' }
    }
  ];

  let errors = errorsArrayToHash(errorsArray);
  // {
  //   "name": ["Must be present"],
  //   "age":  ["Must be present", "must be a number"]
  // }
  ```

  @method errorsArrayToHash
  @static
  @for @ember-data/adapter/error
  @deprecated
  @public
  @param {Array} errors array of errors in JSON-API format
  @return {Object}
*/
export function errorsArrayToHash(errors) {
  if (DEPRECATE_HELPERS) {
    deprecate(`errorsArrayToHash helper has been deprecated.`, false, {
      id: 'ember-data:deprecate-errors-array-to-hash-helper',
      for: 'ember-data',
      until: '5.0',
      since: { available: '4.7', enabled: '4.7' },
    });
    let out = {};

    if (errors) {
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
  assert(`errorsArrayToHash helper has been removed`);
}
