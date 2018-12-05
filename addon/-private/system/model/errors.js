import { mapBy, not } from '@ember/object/computed';
import Evented from '@ember/object/evented';
import ArrayProxy from '@ember/array/proxy';
import { set, get, computed } from '@ember/object';
import { makeArray, A } from '@ember/array';

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
  @extends Ember.ArrayProxy
  @uses Ember.Evented
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
    @property errorsByAttributeName
    @type {MapWithDefault}
    @private
  */
  errorsByAttributeName: computed(function() {
    return new Map();
  }),

  /**
    Returns errors for a given attribute

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
    @param {String} attribute
    @return {Array}
  */
  errorsFor(attribute) {
    let map = get(this, 'errorsByAttributeName');

    if (!map.has(attribute)) {
      map.set(attribute, new A());
    }

    return map.get(attribute);
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
    @type {Array}
  */
  messages: mapBy('content', 'message'),

  /**
    @property content
    @type {Array}
    @private
  */
  content: computed(function() {
    return A();
  }),

  /**
    @method unknownProperty
    @private
  */
  unknownProperty(attribute) {
    let errors = this.errorsFor(attribute);
    if (errors.length === 0) {
      return undefined;
    }
    return errors;
  },

  /**
    Total number of errors.

    @property length
    @type {Number}
    @readOnly
  */

  /**
    @property isEmpty
    @type {Boolean}
    @readOnly
  */
  isEmpty: not('length').readOnly(),

  /**
   Manually adds errors to the record. This will triger the `becameInvalid` event/ lifecycle method on
    the record and transition the record into an `invalid` state.

   Example
   ```javascript
    let errors = get(user, 'errors');
    
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

    errors.errorsFor('password');
    // =>
    // [
    //   { attribute: 'username', message: 'This field is required' },
    // ]
   ```
  @method add
  @param {string} attribute - the property name of an attribute or relationship
  @param {string[]|string} messages - an error message or array of error messages for the attribute
   */
  add(attribute, messages) {
    let wasEmpty = get(this, 'isEmpty');

    this._add(attribute, messages);

    if (wasEmpty && !get(this, 'isEmpty')) {
      this.trigger('becameInvalid');
    }
  },

  /**
    Adds error messages to a given attribute without sending event.

    @method _add
    @private
  */
  _add(attribute, messages) {
    messages = this._findOrCreateMessages(attribute, messages);
    this.addObjects(messages);

    this.errorsFor(attribute).addObjects(messages);

    this.notifyPropertyChange(attribute);
  },

  /**
    @method _findOrCreateMessages
    @private
  */
  _findOrCreateMessages(attribute, messages) {
    let errors = this.errorsFor(attribute);
    let messagesArray = makeArray(messages);
    let _messages = new Array(messagesArray.length);

    for (let i = 0; i < messagesArray.length; i++) {
      let message = messagesArray[i];
      let err = errors.findBy('message', message);
      if (err) {
        _messages[i] = err;
      } else {
        _messages[i] = {
          attribute: attribute,
          message: message,
        };
      }
    }

    return _messages;
  },

  /**
   Manually removes all errors for a given member from the record.
     This will transition the record into a `valid` state, and
    triggers the `becameValid` event and lifecycle method.

   Example:

   ```javascript
    let errors = get('user', errors);
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
   @param {string} member - the property name of an attribute or relationship
   */
  remove(attribute) {
    if (get(this, 'isEmpty')) {
      return;
    }

    this._remove(attribute);

    if (get(this, 'isEmpty')) {
      this.trigger('becameValid');
    }
  },

  /**
    Removes all error messages from the given attribute without sending event.

    @method _remove
    @private
  */
  _remove(attribute) {
    if (get(this, 'isEmpty')) {
      return;
    }

    let content = this.rejectBy('attribute', attribute);
    set(this, 'content', content);
    get(this, 'errorsByAttributeName').delete(attribute);

    this.notifyPropertyChange(attribute);
    this.notifyPropertyChange('length');
  },

  /**
   Manually clears all errors for the record.
     This will transition the record into a `valid` state, and
     will trigger the `becameValid` event and lifecycle method.
   
  Example:
   
   ```javascript
   let errors = get('user', errors);
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
   
   errors.get('messages')
   // => []
   ```
   @method remove
   */
  clear() {
    if (get(this, 'isEmpty')) {
      return;
    }

    this._clear();
    this.trigger('becameValid');
  },

  /**
    Removes all error messages.
    to the record.

    @method _clear
    @private
  */
  _clear() {
    if (get(this, 'isEmpty')) {
      return;
    }

    let errorsByAttributeName = get(this, 'errorsByAttributeName');
    let attributes = [];

    errorsByAttributeName.forEach(function(_, attribute) {
      attributes.push(attribute);
    });

    errorsByAttributeName.clear();
    attributes.forEach(attribute => {
      this.notifyPropertyChange(attribute);
    });

    ArrayProxy.prototype.clear.call(this);
  },

  /**
    Checks if there are error messages for the given attribute.

    ```app/routes/user/edit.js
    import Route from '@ember/routing/route';

    export default Route.extend({
      actions: {
        save: function(user) {
          if (user.get('errors').has('email')) {
            return alert('Please update your email before attempting to save.');
          }
          user.save();
        }
      }
    });
    ```

    @method has
    @param {String} attribute
    @return {Boolean} true if there some errors on given attribute
  */
  has(attribute) {
    return this.errorsFor(attribute).length > 0;
  },
});
