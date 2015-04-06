/**
  The `DS.Transform` class is used to serialize and deserialize model
  attributes when they are saved or loaded from an
  adapter. Subclassing `DS.Transform` is useful for creating custom
  attributes. All subclasses of `DS.Transform` must implement a
  `serialize` and a `deserialize` method.

  Example

  ```javascript
  // Converts centigrade in the JSON to fahrenheit in the app
  App.TemperatureTransform = DS.Transform.extend({
    deserialize: function(serialized) {
      return (serialized *  1.8) + 32;
    },
    serialize: function(deserialized) {
      return (deserialized - 32) / 1.8;
    }
  });
  ```

  Usage

  ```javascript
  var attr = DS.attr;
  App.Requirement = DS.Model.extend({
    name: attr('string'),
    temperature: attr('temperature')
  });
  ```

  @class Transform
  @namespace DS
 */
export default Ember.Object.extend({
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
    @param {mixed} deserialized The deserialized value
    @return {mixed} The serialized value
  */
  serialize: null,

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
    @param {mixed} serialized The serialized value
    @return {mixed} The deserialized value
  */
  deserialize: null
});
