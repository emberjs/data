import { A } from '@ember/array';
import type NativeArray from '@ember/array/-private/native-array';
import ArrayProxy from '@ember/array/proxy';
import { computed, get } from '@ember/object';
import { mapBy, not } from '@ember/object/computed';

import type RecordState from './record-state';

type ValidationError = {
  attribute: string;
  message: string;
};
/**
  @module @ember-data/model
*/
interface ArrayProxyWithCustomOverrides<T, M = T> extends Omit<ArrayProxy<T, M>, 'clear' | 'content'> {
  // Omit causes `content` to be merged with the class def for ArrayProxy
  // which then causes it to be seen as a property, disallowing defining it
  // as an accessor. This restores our ability to define it as an accessor.
  content: NativeArray<T>;
  clear(): void;
  _has(name: string): boolean;
}

// we force the type here to our own construct because mixin and extend patterns
// lose generic signatures. We also do this because we need to Omit `clear` from
// the type of ArrayProxy as we override it's signature.
const ArrayProxyWithCustomOverrides = ArrayProxy as unknown as new <T, M = T>() => ArrayProxyWithCustomOverrides<T, M>;

/**
  Holds validation errors for a given record, organized by attribute names.

  This class is not directly instantiable.

  Every `Model` has an `errors` property that is an instance of
  `Errors`. This can be used to display validation error
  messages returned from the server when a `record.save()` rejects.

  For Example, if you had a `User` model that looked like this:

  ```app/models/user.js
  import Model, { attr } from '@ember-data/model';

  export default class UserModel extends Model {
    @attr('string') username;
    @attr('string') email;
  }
  ```
  And you attempted to save a record that did not validate on the backend:

  ```javascript
  let user = store.createRecord('user', {
    username: 'tomster',
    email: 'invalidEmail'
  });
  user.save();
  ```

  Your backend would be expected to return an error response that described
  the problem, so that error messages can be generated on the app.

  API responses will be translated into instances of `Errors` differently,
  depending on the specific combination of adapter and serializer used. You
  may want to check the documentation or the source code of the libraries
  that you are using, to know how they expect errors to be communicated.

  Errors can be displayed to the user by accessing their property name
  to get an array of all the error objects for that property. Each
  error object is a JavaScript object with two keys:

  - `message` A string containing the error message from the backend
  - `attribute` The name of the property associated with this error message

  ```handlebars
  <label>Username: <Input @value={{@model.username}} /> </label>
  {{#each @model.errors.username as |error|}}
    <div class="error">
      {{error.message}}
    </div>
  {{/each}}

  <label>Email: <Input @value={{@model.email}} /> </label>
  {{#each @model.errors.email as |error|}}
    <div class="error">
      {{error.message}}
    </div>
  {{/each}}
  ```

  You can also access the special `messages` property on the error
  object to get an array of all the error strings.

  ```handlebars
  {{#each @model.errors.messages as |message|}}
    <div class="error">
      {{message}}
    </div>
  {{/each}}
  ```

  @class Errors
  @public
  @extends Ember.ArrayProxy
 */
export default class Errors extends ArrayProxyWithCustomOverrides<ValidationError> {
  declare __record: { currentState: RecordState };
  /**
    @property errorsByAttributeName
    @type {MapWithDefault}
    @private
  */
  @computed()
  get errorsByAttributeName(): Map<string, NativeArray<ValidationError>> {
    return new Map();
  }

  /**
    Returns errors for a given attribute

    ```javascript
    let user = store.createRecord('user', {
      username: 'tomster',
      email: 'invalidEmail'
    });
    user.save().catch(function(){
      user.errors.errorsFor('email'); // returns:
      // [{attribute: "email", message: "Doesn't look like a valid email."}]
    });
    ```

    @method errorsFor
    @public
    @param {String} attribute
    @return {Array}
  */
  errorsFor(attribute: string): NativeArray<ValidationError> {
    let map = this.errorsByAttributeName;

    let errors = map.get(attribute);

    if (errors === undefined) {
      errors = A<ValidationError>();
      map.set(attribute, errors);
    }

    // Errors may be a native array with extensions turned on. Since we access
    // the array via a method, and not a computed or using `Ember.get`, it does
    // not entangle properly with autotracking, so we entangle manually by
    // getting the `[]` property.
    get(errors, '[]');

    return errors;
  }

  /**
    An array containing all of the error messages for this
    record. This is useful for displaying all errors to the user.

    ```handlebars
    {{#each @model.errors.messages as |message|}}
      <div class="error">
        {{message}}
      </div>
    {{/each}}
    ```

    @property messages
    @public
    @type {Array}
  */
  @mapBy('content', 'message')
  declare messages: string[];

  /**
    @property content
    @type {Array}
    @private
  */
  @computed()
  get content(): NativeArray<ValidationError> {
    return A();
  }

  /**
    @method unknownProperty
    @private
  */
  unknownProperty(attribute: string) {
    let errors = this.errorsFor(attribute);
    if (errors.length === 0) {
      return undefined;
    }
    return errors;
  }

  /**
    Total number of errors.

    @property length
    @type {Number}
    @public
    @readOnly
  */

  /**
    `true` if we have no errors.

    @property isEmpty
    @type {Boolean}
    @public
    @readOnly
  */
  @not('length')
  declare isEmpty: boolean;

  /**
   Manually adds errors to the record. This will trigger the `becameInvalid` event/ lifecycle method on
    the record and transition the record into an `invalid` state.

   Example
   ```javascript
    let errors = user.errors;

    // add multiple errors
    errors.add('password', [
      'Must be at least 12 characters',
      'Must contain at least one symbol',
      'Cannot contain your name'
    ]);

    errors.errorsFor('password');
    // =>
    // [
    //   { attribute: 'password', message: 'Must be at least 12 characters' },
    //   { attribute: 'password', message: 'Must contain at least one symbol' },
    //   { attribute: 'password', message: 'Cannot contain your name' },
    // ]

    // add a single error
    errors.add('username', 'This field is required');

    errors.errorsFor('username');
    // =>
    // [
    //   { attribute: 'username', message: 'This field is required' },
    // ]
   ```
    @method add
    @public
    @param {string} attribute - the property name of an attribute or relationship
    @param {string[]|string} messages - an error message or array of error messages for the attribute
   */
  add(attribute: string, messages: string[] | string): void {
    const errors = this._findOrCreateMessages(attribute, messages);
    this.addObjects(errors);

    this.errorsFor(attribute).addObjects(errors);
    this.__record.currentState.notify('isValid');

    this.notifyPropertyChange(attribute);
  }

  /**
    @method _findOrCreateMessages
    @private
  */
  _findOrCreateMessages(attribute: string, messages: string | string[]): ValidationError[] {
    let errors = this.errorsFor(attribute);
    let messagesArray = Array.isArray(messages) ? messages : [messages];
    let _messages: ValidationError[] = new Array(messagesArray.length) as ValidationError[];

    for (let i = 0; i < messagesArray.length; i++) {
      let message = messagesArray[i];
      let err = errors.findBy('message', message);
      if (err) {
        _messages[i] = err;
      } else {
        _messages[i] = {
          attribute: attribute,
          message,
        };
      }
    }

    return _messages;
  }

  /**
   Manually removes all errors for a given member from the record.
     This will transition the record into a `valid` state, and
    triggers the `becameValid` event and lifecycle method.

   Example:

   ```javascript
    let errors = user.errors;
    errors.add('phone', ['error-1', 'error-2']);

    errors.errorsFor('phone');
    // =>
    // [
    //   { attribute: 'phone', message: 'error-1' },
    //   { attribute: 'phone', message: 'error-2' },
    // ]

    errors.remove('phone');

    errors.errorsFor('phone');
    // => undefined
   ```
   @method remove
    @public
   @param {string} member - the property name of an attribute or relationship
   */
  remove(attribute: string) {
    if (this.isEmpty) {
      return;
    }

    let content = this.rejectBy('attribute', attribute);
    this.content.setObjects(content);

    // Although errorsByAttributeName.delete is technically enough to sync errors state, we also
    // must mutate the array as well for autotracking
    let errors = this.errorsFor(attribute);
    for (let i = 0; i < errors.length; i++) {
      if (errors[i].attribute === attribute) {
        // .replace from Ember.NativeArray is necessary. JS splice will not work.
        errors.replace(i, 1);
      }
    }
    this.errorsByAttributeName.delete(attribute);

    this.__record.currentState.notify('isValid');
    this.notifyPropertyChange(attribute);
    this.notifyPropertyChange('length');
  }

  /**
   Manually clears all errors for the record.
     This will transition the record into a `valid` state, and
     will trigger the `becameValid` event and lifecycle method.

  Example:

   ```javascript
   let errors = user.errors;
   errors.add('username', ['error-a']);
   errors.add('phone', ['error-1', 'error-2']);

   errors.errorsFor('username');
   // =>
   // [
   //   { attribute: 'username', message: 'error-a' },
   // ]

   errors.errorsFor('phone');
   // =>
   // [
   //   { attribute: 'phone', message: 'error-1' },
   //   { attribute: 'phone', message: 'error-2' },
   // ]

   errors.clear();

   errors.errorsFor('username');
   // => undefined

   errors.errorsFor('phone');
   // => undefined

   errors.messages
   // => []
   ```
   @method clear
   @public
   */
  clear(): void {
    if (this.isEmpty) {
      return;
    }

    let errorsByAttributeName = this.errorsByAttributeName;
    let attributes: string[] = [];

    errorsByAttributeName.forEach(function (_, attribute) {
      attributes.push(attribute);
    });

    errorsByAttributeName.clear();
    attributes.forEach((attribute) => {
      this.notifyPropertyChange(attribute);
    });

    this.__record.currentState.notify('isValid');
    super.clear();
  }

  /**
    Checks if there are error messages for the given attribute.

    ```app/controllers/user/edit.js
    import Controller from '@ember/controller';
    import { action } from '@ember/object';

    export default class UserEditController extends Controller {
      @action
      save(user) {
        if (user.errors.has('email')) {
          return alert('Please update your email before attempting to save.');
        }
        user.save();
      }
    }
    ```

    @method has
    @public
    @param {String} attribute
    @return {Boolean} true if there some errors on given attribute
  */
  has(attribute: string): boolean {
    return this.errorsFor(attribute).length > 0;
  }
}
