/**
  The `DS.Transform` class is used to serialize and deserialize model
  attributes when they are saved or loaded from an
  adapter. Subclassing `DS.Transform` is useful for creating custom
  attributes. All subclasses of `DS.Transform` must implement a
  `serialize` and a `deserialize` method.

  Example

  ```javascript
  App.RawTransform = DS.Transform.extend({
    deserialize: function(serialized) {
      return serialized;
    },
    serialize: function(deserialized) {
      return deserialized;
    }
  });
  ```

  Usage

  ```javascript
  var attr = DS.attr;
  App.Requirement = DS.Model.extend({
    name: attr('string'),
    optionsArray: attr('raw')
  });
  ```

  @class Transform
  @namespace DS
 */
DS.Transform = Ember.Object.extend({
  /**
    When given a deserialized value from a record attribute this
    method must return the serialized value.

    Example

    ```javascript
    serialize: function(deserialized) {
      return Ember.isEmpty(deserialized) ? null : Number(deserialized);
    }
    ```

    @method serialize
    @param deserialized The deserialized value
    @return The serialized value
  */
  serialize: Ember.required(),

  /**
    When given a serialize value from a JSON object this method must
    return the deserialized value for the record attribute.

    Example

    ```javascript
    deserialize: function(serialized) {
      return empty(serialized) ? null : Number(serialized);
    }
    ```

    @method deserialize
    @param serialized The serialized value
    @return The deserialized value
  */
  deserialize: Ember.required()

});
