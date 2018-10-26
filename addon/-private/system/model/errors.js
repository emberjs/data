import { mapBy, not } from '@ember/object/computed';
import Evented from '@ember/object/evented';
import ArrayProxy from '@ember/array/proxy';
import { set, get, computed } from '@ember/object';
import { makeArray, A } from '@ember/array';
import { deprecate } from '@ember/debug';

/**
@module ember-data
*/

/**
  Holds validation errors for a given record, organized by attribute names.

  Every `DS.Model` has an `errors` property that is an instance of
  `DS.Errors`. This can be used to display validation error
  messages returned from the server when a `record.save()` rejects.

  For Example, if you had a `User` model that looked like this:

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    username: DS.attr('string'),
    email: DS.attr('string')
  });
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

  API responses will be translated into instances of `DS.Errors` differently,
  depending on the specific combination of adapter and serializer used. You
  may want to check the documentation or the source code of the libraries
  that you are using, to know how they expect errors to be communicated.

  Errors can be displayed to the user by accessing their property name
  to get an array of all the error objects for that property. Each
  error object is a JavaScript object with two keys:

  - `message` A string containing the error message from the backend
  - `attribute` The name of the property associated with this error message

  ```handlebars
  <label>Username: {{input value=username}} </label>
  {{#each model.errors.username as |error|}}
    <div class="error">
      {{error.message}}
    </div>
  {{/each}}

  <label>Email: {{input value=email}} </label>
  {{#each model.errors.email as |error|}}
    <div class="error">
      {{error.message}}
    </div>
  {{/each}}
  ```

  You can also access the special `messages` property on the error
  object to get an array of all the error strings.

  ```handlebars
  {{#each model.errors.messages as |message|}}
    <div class="error">
      {{message}}
    </div>
  {{/each}}
  ```

  @class Errors
  @namespace DS
  @extends ArrayProxy
  @uses Evented
 */
export default ArrayProxy.extend(Evented, {
  /**
    Register with target handler

    @method _registerHandlers
    @private
  */
  _registerHandlers(target, becameInvalid, becameValid) {
    this.on('becameInvalid', target, becameInvalid);
    this.on('becameValid', target, becameValid);
  },

  /**
    @property errorsByMemberName
    @type {Map}
    @private
  */
  errorsByMemberName: computed(function() {
    return new Map();
  }),

  /**
    Returns errors for a given member

    ```javascript
    let user = store.createRecord('user', {
      username: 'tomster',
      email: 'invalidEmail'
    });
    user.save().catch(function(){
      user.get('errors').errorsFor('email'); // returns:
      // [{attribute: "email", message: "Doesn't look like a valid email."}]
    });
    ```

    @method errorsFor
    @param {string} member - the property name of an attribute or relationship
    @return {{ member, message }[]}
  */
  errorsFor(member) {
    let map = this.get('errorsByMemberName');

    if (!map.has(member)) {
      map.set(member, new A());
    }

    return map.get(member);
  },

  /**
    An array containing all of the error messages for this
    record. This is useful for displaying all errors to the user.

    ```handlebars
    {{#each model.errors.messages as |message|}}
      <div class="error">
        {{message}}
      </div>
    {{/each}}
    ```

    @property messages
    @type {string[]}
  */
  messages: mapBy('content', 'message'),

  /**
    @property content
    @type {{ member, message }[]}
    @private
  */
  content: computed(function() {
    return A();
  }),

  /**
    @method unknownProperty
    @param {string} member - the property name of an attribute or relationship
    @returns {A|undefined} - the array of errors or undefined if there are no errors.
    @private
  */
  unknownProperty(member) {
    let errors = this.errorsFor(member);

    if (errors.length === 0) {
      return undefined;
    }

    return errors;
  },

  /**
    Total number of errors.

    @property length
    @type {number}
    @readOnly
  */

  /**
    @property isEmpty
    @type {boolean}
    @readOnly
  */
  isEmpty: not('length').readOnly(),

  /**
   Manually adds errors to the record. This will not
     transition the record into an `invalid` state, nor
     will it trigger the `becameInvalid` event or lifecycle method.

   Example

   ```javascript
   let errors = get(user, 'errors');

   // add multiple errors
   errors.addErrors('password', [
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
   errors.addErrors('username', 'This field is required');

   errors.errorsFor('password');
   // =>
   // [
   //   { attribute: 'username', message: 'This field is required' },
   // ]
   ```

    @method addErrors
    @param {string} member - the property name of an attribute or relationship
    @param {string[]|string} messages - an error message or array of error messages for the attribute
   */
  addErrors(member, messages) {
    messages = this._findOrCreateMessages(member, messages);
    this.addObjects(messages);

    this.errorsFor(member).addObjects(messages);

    this.notifyPropertyChange(member);
  },

  /**
    @method add
    @param {string} member - the property name of an attribute or relationship
    @param {string[]|string} messages - an error message or array of error messages for the attribute
    @deprecated use addErrors instead
   */
  add(member, messages) {
    deprecate(`Errors.add has been deprecated in favor of Errors.addErrors which does not mutate record state`, false, {
      id: 'ember-data:errors-changing-record-state',
      until: '3.8'
    });

    let wasEmpty = get(this, 'isEmpty');

    this.addErrors(member, messages);

    if (wasEmpty && !get(this, 'isEmpty')) {
      this.trigger('becameInvalid');
    }
  },

  /**
    @method _add
    @param {string} member - the property name of an attribute or relationship
    @param {string[]|string} messages - an error message or array of error messages for the attribute
    @deprecated use addErrors instead
    @private
   */
  _add(member, messages) {
    deprecate(`Errors._add has been deprecated in favor of Errors.addErrors which does not mutate record state`, false, {
      id: 'ember-data:errors-changing-record-state',
      until: '3.8'
    });
    this.addErrors(member, messages);
  },

  /**
    @method _findOrCreateMessages
    @param {string} member - the property name of an attribute or relationship
    @param {string[]|string} messages - an error message or array of error messages for the attribute
    @returns {{ member, message }[]}
    @private
  */
  _findOrCreateMessages(member, messages) {
    let errors = this.errorsFor(member);
    let messagesArray = makeArray(messages);
    let _messages = new Array(messagesArray.length);

    for (let i = 0; i < messagesArray.length; i++) {
      let message = messagesArray[i];
      let err = errors.findBy('message', message);
      if (err) {
        _messages[i] = err;
      } else {
        _messages[i] = {
          // really this should be "member" but this was leaked to the public
          attribute: member,
          message
        };
      }
    }

    return _messages;
  },

  /**
   Manually removes all errors for a given member from the record.
     This will not transition the record into an `valid` state, nor
     will it trigger the `becameValid` event or lifecycle method.

   Example:

   ```javascript
   let errors = get('user', errors);
   errors.addErrors('phone', ['error-1', 'error-2']);

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

   @method removeErrors
   @param {string} member - the property name of an attribute or relationship
   */
  removeErrors(member) {
    if (get(this, 'isEmpty')) {
      return;
    }

    let content = this.rejectBy('attribute', member);
    set(this, 'content', content);
    get(this, 'errorsByMemberName').delete(member);

    this.notifyPropertyChange(member);
    this.notifyPropertyChange('length');
  },

  /**
   @method remove
   @param {string} member - the property name of an attribute or relationship
   @deprecated use removeErrors instead
   */
  remove(member) {
    deprecate(`Errors.remove has been deprecated in favor of Errors.removeErrors which does not mutate record state`, false, {
      id: 'ember-data:errors-changing-record-state',
      until: '3.8'
    });

    if (get(this, 'isEmpty')) {
      return;
    }

    this.removeErrors(member);

    if (get(this, 'isEmpty')) {
      this.trigger('becameValid');
    }
  },

  /**
   @method remove
   @param {string} member - the property name of an attribute or relationship
   @deprecated use removeErrors instead
   @private
   */
  _remove(member) {
    deprecate(`Errors.remove has been deprecated in favor of Errors.removeErrors which does not mutate record state`, false, {
      id: 'ember-data:errors-changing-record-state',
      until: '3.8'
    });

    this.removeErrors(member);
  },

  /**
   Manually clears all errors for the record.
     This will not transition the record into an `valid` state, nor
     will it trigger the `becameValid` event or lifecycle method.

   Example:

   ```javascript
   ```javascript
   let errors = get('user', errors);
   errors.addErrors('username', ['error-a']);
   errors.addErrors('phone', ['error-1', 'error-2']);

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

   errors.clearErrors();

   errors.errorsFor('username');
   // => undefined

   errors.errorsFor('phone');
   // => undefined

   errors.get('messages')
   // => []
   ```

   @method removeErrors
   */
  clearErrors() {
    if (get(this, 'isEmpty')) {
      return;
    }

    let errorsByMemberName = get(this, 'errorsByMemberName');
    let members = [];

    errorsByMemberName.forEach(function(_, member) {
      members.push(member);
    });

    errorsByMemberName.clear();
    members.forEach(member => {
      this.notifyPropertyChange(member);
    });

    // after the deprecation completes in 3.8
    //  we can move the `clearErrors` logic back
    //  into `clear` and call `super` if we desire.
    ArrayProxy.prototype.clear.call(this);
  },

  /**
    @method clear
    @deprecated use clearErrors instead
  */
  clear() {
    deprecate(`Errors.clear has been deprecated in favor of Errors.clearErrors which does not mutate record state`, false, {
      id: 'ember-data:errors-changing-record-state',
      until: '3.8'
    });

    if (get(this, 'isEmpty')) {
      return;
    }

    this.clearErrors();
    this.trigger('becameValid');
  },

  /**
    @method _clear
    @deprecated use clearErrors instead
    @private
  */
  _clear() {
    deprecate(`Errors._clear has been deprecated in favor of Errors.clearErrors which does not mutate record state`, false, {
      id: 'ember-data:errors-changing-record-state',
      until: '3.8'
    });

    this.clearErrors();
  },

  /**
    Checks if there are error messages for the given attribute.

   ```javascript
   let errors = get('user', errors);
   errors.addErrors('phone', ['error-1', 'error-2']);

   errors.has('phone'); // true

   errors.remove('phone');

   errors.has('phone'); // false
   ```

    @method has
    @param {string} member - the property name of an attribute or relationship
    @return {boolean} true if there exist any errors for the given member
  */
  has(member) {
    return this.errorsFor(member).length > 0;
  },
});
