import EmberObject from '@ember/object';

/**
  @module @ember-data/serializer
*/

/**
  The `Transform` class is used to serialize and deserialize model
  attributes when they are saved or loaded from an
  adapter. Subclassing `Transform` is useful for creating custom
  attributes. All subclasses of `Transform` must implement a
  `serialize` and a `deserialize` method.

  Example

  ```app/transforms/temperature.js
  import Transform from '@ember-data/serializer/transform';

  // Converts centigrade in the JSON to fahrenheit in the app
  export default Transform.extend({
    deserialize(serialized, options) {
      return (serialized *  1.8) + 32;
    },

    serialize(deserialized, options) {
      return (deserialized - 32) / 1.8;
    }
  });
  ```

  Usage

  ```app/models/requirement.js
  import Model, { attr } from '@ember-data/model';

  export default Model.extend({
    name: attr('string'),
    temperature: attr('temperature')
  });
  ```

  The options passed into the `attr` function when the attribute is
  declared on the model is also available in the transform.

  ```app/models/post.js
  import Model, { attr } from '@ember-data/model';

  export default Model.extend({
    title: attr('string'),
    markdown: attr('markdown', {
      markdown: {
        gfm: false,
        sanitize: true
      }
    })
  });
  ```

  ```app/transforms/markdown.js
  import Transform from '@ember-data/serializer/transform';

  export default Transform.extend({
    serialize(deserialized, options) {
      return deserialized.raw;
    },

    deserialize(serialized, options) {
      var markdownOptions = options.markdown || {};

      return marked(serialized, markdownOptions);
    }
  });
  ```

  @class Transform
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
    @param options hash of options passed to `attr`
    @return The serialized value
  */
  serialize: null,

  /**
    When given a serialized value from a JSON object this method must
    return the deserialized value for the record attribute.

    Example

    ```javascript
    deserialize(serialized, options) {
      return empty(serialized) ? null : Number(serialized);
    }
    ```

    @method deserialize
    @param serialized The serialized value
    @param options hash of options passed to `attr`
    @return The deserialized value
  */
  deserialize: null,
});
