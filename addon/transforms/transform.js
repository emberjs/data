import EmberObject from '@ember/object';

/**
  The `DS.Transform` class is used to serialize and deserialize model
  attributes when they are saved or loaded from an
  adapter. Subclassing `DS.Transform` is useful for creating custom
  attributes. All subclasses of `DS.Transform` must implement a
  `serialize` and a `deserialize` method.

  Example

  ```app/transforms/temperature.js
  import DS from 'ember-data';

  // Converts centigrade in the JSON to fahrenheit in the app
  export default DS.Transform.extend({
    deserialize(serialized, options) {
      return (serialized *  1.8) + 32;
    },

    serialize(deserialized, options) {
      return (deserialized - 32) / 1.8;
    }
  });
  ```

  The options passed into the `DS.attr` function when the attribute is
  declared on the model is also available in the transform.

  ```app/models/post.js
  export default DS.Model.extend({
    title: DS.attr('string'),
    markdown: DS.attr('markdown', {
      markdown: {
        gfm: false,
        sanitize: true
      }
    })
  });
  ```

  ```app/transforms/markdown.js
  export default DS.Transform.extend({
    serialize(deserialized, options) {
      return deserialized.raw;
    },

    deserialize(serialized, options) {
      var markdownOptions = options.markdown || {};

      return marked(serialized, markdownOptions);
    }
  });
  ```

  Usage

  ```app/models/requirement.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    name: DS.attr('string'),
    temperature: DS.attr('temperature')
  });
  ```

  @class Transform
  @namespace DS
 */
export default EmberObject.extend({
  /**
    When given a deserialized value from a record attribute this
    method must return the serialized value.

    Example

    ```javascript
    import { isEmpty } from '@ember/utils';

    serialize(deserialized, options) {
      return isEmpty(deserialized) ? null : Number(deserialized);
    }
    ```

    @method serialize
    @param deserialized The deserialized value
    @param options hash of options passed to `DS.attr`
    @return The serialized value
  */
  serialize: null,

  /**
    When given a serialize value from a JSON object this method must
    return the deserialized value for the record attribute.

    Example

    ```javascript
    deserialize(serialized, options) {
      return empty(serialized) ? null : Number(serialized);
    }
    ```

    @method deserialize
    @param serialized The serialized value
    @param options hash of options passed to `DS.attr`
    @return The deserialized value
  */
  deserialize: null
});
