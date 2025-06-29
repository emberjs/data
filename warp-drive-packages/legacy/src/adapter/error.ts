/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { assert } from '@warp-drive/core/build-config/macros';
import type { JsonApiError } from '@warp-drive/core/store/-types/q/record-data-json-api';
import { getOrSetGlobal } from '@warp-drive/core/types/-private';

/**
  ## Overview

  <blockquote style="margin: 1em; padding: .1em 1em .1em 1em; border-left: solid 1em #E34C32; background: #e0e0e0;">
  <p>
    ⚠️ <strong>This is LEGACY documentation</strong> for a feature that is no longer encouraged to be used.
    If starting a new app or thinking of implementing a new adapter, consider writing a
    <a href="/ember-data/release/classes/%3CInterface%3E%20Handler">Handler</a> instead to be used with the <a href="https://github.com/emberjs/data/tree/main/packages/request#readme">RequestManager</a>
  </p>
  </blockquote>

  An `AdapterError` is used by an adapter to signal that an error occurred
  during a request to an external API. It indicates a generic error, and
  subclasses are used to indicate specific error states.

  To create a custom error to signal a specific error state in communicating
  with an external API, extend the `AdapterError`. For example, if the
  external API exclusively used HTTP `503 Service Unavailable` to indicate
  it was closed for maintenance:

  ```js [app/adapters/maintenance-error.js]
  import AdapterError from '@ember-data/adapter/error';

  export default AdapterError.extend({ message: "Down for maintenance." });
  ```

  This error would then be returned by an adapter's `handleResponse` method:

  ```js [app/adapters/application.js]
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

  ```js [app/routes/application.js]
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

  @class AdapterError
  @public
*/
function _AdapterError(this: AdapterRequestError, errors: JsonApiError[], message = 'Adapter operation failed') {
  this.isAdapterError = true;
  const error = Error.call(this, message);

  if (error) {
    this.stack = error.stack;
    // @ts-expect-error untyped
    this.description = error.description;
    // @ts-expect-error untyped
    this.fileName = error.fileName;
    // @ts-expect-error untyped
    this.lineNumber = error.lineNumber;
    this.message = error.message;
    this.name = error.name;
    // @ts-expect-error untyped
    this.number = error.number;
  }

  this.errors = errors || [
    {
      title: 'Adapter Error',
      detail: message,
    },
  ];
}

export interface AdapterRequestError<T extends string = string> extends Error {
  isAdapterError: true;
  code: T;
  errors: JsonApiError[];
}
export interface AdapterRequestErrorConstructor<Instance extends AdapterRequestError = AdapterRequestError> {
  new (errors?: unknown[], message?: string): Instance;
  extend(options: { message: string }): AdapterRequestErrorConstructor;
}

_AdapterError.prototype = Object.create(Error.prototype);

_AdapterError.prototype.code = 'AdapterError';
_AdapterError.extend = extendFn(_AdapterError as unknown as AdapterRequestErrorConstructor);

export type AdapterError = AdapterRequestError<'AdapterError'>;
export const AdapterError: AdapterRequestErrorConstructor<AdapterError> = getOrSetGlobal(
  'AdapterError',
  _AdapterError as unknown as AdapterRequestErrorConstructor<AdapterError>
);
type ErrorExtender = (opts: { message?: string }) => AdapterRequestErrorConstructor;
function extendFn(ErrorClass: AdapterRequestErrorConstructor): ErrorExtender {
  return function ({ message: defaultMessage }: { message?: string } = {}) {
    return extend(ErrorClass, defaultMessage);
  };
}

function extend<Final extends AdapterRequestError>(
  ParentErrorClass: AdapterRequestErrorConstructor,
  defaultMessage?: string
): AdapterRequestErrorConstructor<Final> {
  const ErrorClass = function (this: AdapterRequestError, errors: JsonApiError[], message?: string) {
    assert('`AdapterError` expects json-api formatted errors array.', Array.isArray(errors || []));
    ParentErrorClass.call(this, errors, message || defaultMessage);
  };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  ErrorClass.prototype = Object.create(ParentErrorClass.prototype);
  ErrorClass.extend = extendFn(ErrorClass as unknown as AdapterRequestErrorConstructor);

  return ErrorClass as unknown as AdapterRequestErrorConstructor<Final>;
}

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

  ```js [app/models/post.js]
  import { Model, attr } from '@warp-drive/legacy/model';

  export default class PostModel extends Model {
    @attr('string') title;
    @attr('string') content;
  }
  ```

  To show an error from the server related to the `title` and
  `content` properties your adapter could return a promise that
  rejects with a `InvalidError` object that looks like this:

  ```js [app/adapters/post.js]
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
*/
// TODO @deprecate extractError documentation
export type InvalidError = AdapterRequestError<'InvalidError'>;
export const InvalidError: AdapterRequestErrorConstructor<InvalidError> = getOrSetGlobal(
  'InvalidError',
  extend<InvalidError>(AdapterError, 'The adapter rejected the commit because it was invalid')
);
InvalidError.prototype.code = 'InvalidError';

/**
  A `TimeoutError` is used by an adapter to signal that a request
  to the external API has timed out. I.e. no response was received from
  the external API within an allowed time period.

  An example use case would be to warn the user to check their internet
  connection if an adapter operation has timed out:

  ```js [app/routes/application.js]
  import { TimeoutError } from '@ember-data/adapter/error';

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
*/
export type TimeoutError = AdapterRequestError<'TimeoutError'>;
export const TimeoutError: AdapterRequestErrorConstructor<TimeoutError> = getOrSetGlobal(
  'TimeoutError',
  extend(AdapterError, 'The adapter operation timed out')
);
TimeoutError.prototype.code = 'TimeoutError';

/**
  A `AbortError` is used by an adapter to signal that a request to
  the external API was aborted. For example, this can occur if the user
  navigates away from the current page after a request to the external API
  has been initiated but before a response has been received.

  @class AbortError
  @public
*/
export type AbortError = AdapterRequestError<'AbortError'>;
export const AbortError: AdapterRequestErrorConstructor<AbortError> = getOrSetGlobal(
  'AbortError',
  extend(AdapterError, 'The adapter operation was aborted')
);
AbortError.prototype.code = 'AbortError';

/**
  A `UnauthorizedError` equates to a HTTP `401 Unauthorized` response
  status. It is used by an adapter to signal that a request to the external
  API was rejected because authorization is required and has failed or has not
  yet been provided.

  An example use case would be to redirect the user to a login route if a
  request is unauthorized:

  ```js [app/routes/application.js]
  import { UnauthorizedError } from '@ember-data/adapter/error';

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
*/
export type UnauthorizedError = AdapterRequestError<'UnauthorizedError'>;
export const UnauthorizedError: AdapterRequestErrorConstructor<UnauthorizedError> = getOrSetGlobal(
  'UnauthorizedError',
  extend(AdapterError, 'The adapter operation is unauthorized')
);
UnauthorizedError.prototype.code = 'UnauthorizedError';

/**
  A `ForbiddenError` equates to a HTTP `403 Forbidden` response status.
  It is used by an adapter to signal that a request to the external API was
  valid but the server is refusing to respond to it. If authorization was
  provided and is valid, then the authenticated user does not have the
  necessary permissions for the request.

  @class ForbiddenError
  @public
*/
export type ForbiddenError = AdapterRequestError<'ForbiddenError'>;
export const ForbiddenError: AdapterRequestErrorConstructor<ForbiddenError> = getOrSetGlobal(
  'ForbiddenError',
  extend(AdapterError, 'The adapter operation is forbidden')
);
ForbiddenError.prototype.code = 'ForbiddenError';

/**
  A `NotFoundError` equates to a HTTP `404 Not Found` response status.
  It is used by an adapter to signal that a request to the external API
  was rejected because the resource could not be found on the API.

  An example use case would be to detect if the user has entered a route
  for a specific model that does not exist. For example:

  ```js [app/routes/post.js]
  import { NotFoundError } from '@ember-data/adapter/error';

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
*/
export type NotFoundError = AdapterRequestError<'NotFoundError'>;
export const NotFoundError: AdapterRequestErrorConstructor<NotFoundError> = getOrSetGlobal(
  'NotFoundError',
  extend(AdapterError, 'The adapter could not find the resource')
);
NotFoundError.prototype.code = 'NotFoundError';

/**
  A `ConflictError` equates to a HTTP `409 Conflict` response status.
  It is used by an adapter to indicate that the request could not be processed
  because of a conflict in the request. An example scenario would be when
  creating a record with a client-generated ID but that ID is already known
  to the external API.

  @class ConflictError
  @public
*/
export type ConflictError = AdapterRequestError<'ConflictError'>;
export const ConflictError: AdapterRequestErrorConstructor<ConflictError> = getOrSetGlobal(
  'ConflictError',
  extend(AdapterError, 'The adapter operation failed due to a conflict')
);
ConflictError.prototype.code = 'ConflictError';

/**
  A `ServerError` equates to a HTTP `500 Internal Server Error` response
  status. It is used by the adapter to indicate that a request has failed
  because of an error in the external API.

  @class ServerError
  @public
*/
export type ServerError = AdapterRequestError<'ServerError'>;
export const ServerError: AdapterRequestErrorConstructor<ServerError> = getOrSetGlobal(
  'ServerError',
  extend(AdapterError, 'The adapter operation failed due to a server error')
);
ServerError.prototype.code = 'ServerError';
