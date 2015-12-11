import Ember from 'ember';

var get = Ember.get;
var set = Ember.set;
var isEmpty = Ember.isEmpty;
var makeArray = Ember.makeArray;

var MapWithDefault = Ember.MapWithDefault;

/**
@module ember-data
*/

/**
  Holds validation errors for a given record organized by attribute names.

  Every DS.Model has an `errors` property that is an instance of
  `DS.Errors`. This can be used to display validation error
  messages returned from the server when a `record.save()` rejects.

  For Example, if you had an `User` model that looked like this:

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    username: attr('string'),
    email: attr('string')
  });
  ```
  And you attempted to save a record that did not validate on the backend.

  ```javascript
  var user = store.createRecord('user', {
    username: 'tomster',
    email: 'invalidEmail'
  });
  user.save();
  ```

  Your backend data store might return a response that looks like
  this. This response will be used to populate the error object.

  ```javascript
  {
    "errors": [
      {
        "detail": "This username is already taken!",
        "source": {
          "pointer": "data/attributes/username"
        }
      }, {
        "detail": "Doesn't look like a valid email.",
        "source": {
          "pointer": "data/attributes/email"
        }
      }
    ]
  }
  ```

  For additional information on the error object, see the [JSON API spec](http://jsonapi.org/format/#error-objects).

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
  @extends Ember.Object
  @uses Ember.Enumerable
  @uses Ember.Evented
 */
export default Ember.ArrayProxy.extend(Ember.Evented, {
  /**
    Register with target handler

    @method registerHandlers
    @param {Object} target
    @param {Function} becameInvalid
    @param {Function} becameValid
  */
  registerHandlers: function(target, becameInvalid, becameValid) {
    this.on('becameInvalid', target, becameInvalid);
    this.on('becameValid', target, becameValid);
  },

  /**
    @property errorsByAttributeName
    @type {Ember.MapWithDefault}
    @private
  */
  errorsByAttributeName: Ember.computed(function() {
    return MapWithDefault.create({
      defaultValue: function() {
        return Ember.A();
      }
    });
  }),

  /**
    Returns errors for a given attribute

    ```javascript
    var user = store.createRecord('user', {
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
  errorsFor: function(attribute) {
    return get(this, 'errorsByAttributeName').get(attribute);
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
  messages: Ember.computed.mapBy('content', 'message'),

  /**
    @property content
    @type {Array}
    @private
  */
  content: Ember.computed(function() {
    return Ember.A();
  }),

  /**
    @method unknownProperty
    @private
  */
  unknownProperty: function(attribute) {
    var errors = this.errorsFor(attribute);
    if (isEmpty(errors)) { return null; }
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
  isEmpty: Ember.computed.not('length').readOnly(),

  /**
    Adds error messages to a given attribute and sends
    `becameInvalid` event to the record.

    Example:

    ```javascript
    if (!user.get('username') {
      user.get('errors').add('username', 'This field is required');
    }
    ```

    @method add
    @param {String} attribute
    @param {(Array|String)} messages
  */
  add: function(attribute, messages) {
    var wasEmpty = get(this, 'isEmpty');

    messages = this._findOrCreateMessages(attribute, messages);
    this.addObjects(messages);
    get(this, 'errorsByAttributeName').get(attribute).addObjects(messages);

    this.notifyPropertyChange(attribute);

    if (wasEmpty && !get(this, 'isEmpty')) {
      this.trigger('becameInvalid');
    }
  },

  /**
    @method _findOrCreateMessages
    @private
  */
  _findOrCreateMessages: function(attribute, messages) {
    var errors = this.errorsFor(attribute);

    return makeArray(messages).map((message) => {
      return errors.findBy('message', message) || {
        attribute: attribute,
        message: message
      };
    });
  },

  /**
    Removes all error messages from the given attribute and sends
    `becameValid` event to the record if there no more errors left.

    Example:

    ```app/models/user.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      email: DS.attr('string'),
      twoFactorAuth: DS.attr('boolean'),
      phone: DS.attr('string')
    });
    ```

    ```app/routes/user/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        save: function(user) {
           if (!user.get('twoFactorAuth')) {
             user.get('errors').remove('phone');
           }
           user.save();
         }
      }
    });
    ```

    @method remove
    @param {String} attribute
  */
  remove: function(attribute) {
    if (get(this, 'isEmpty')) { return; }

    let content = this.rejectBy('attribute', attribute);
    set(this, 'content', content);
    get(this, 'errorsByAttributeName').delete(attribute);

    this.notifyPropertyChange(attribute);

    if (get(this, 'isEmpty')) {
      this.trigger('becameValid');
    }
  },

  /**
    Removes all error messages and sends `becameValid` event
    to the record.

    Example:

    ```app/routes/user/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        retrySave: function(user) {
           user.get('errors').clear();
           user.save();
         }
      }
    });
    ```

    @method clear
  */
  clear: function() {
    if (get(this, 'isEmpty')) { return; }

    let errorsByAttributeName = get(this, 'errorsByAttributeName');
    let attributes = Ember.A();

    errorsByAttributeName.forEach(function(_, attribute) {
      attributes.push(attribute);
    });

    errorsByAttributeName.clear();
    attributes.forEach(function(attribute) {
      this.notifyPropertyChange(attribute);
    }, this);

    this._super();

    this.trigger('becameValid');
  },

  /**
    Checks if there is error messages for the given attribute.

    ```app/routes/user/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
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
  has: function(attribute) {
    return !isEmpty(this.errorsFor(attribute));
  }
});
