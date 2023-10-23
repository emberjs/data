/**
  @module @ember-data/serializer
*/
import EmberObject from '@ember/object';

import { AttributeSchema } from '@warp-drive/core-types/schema';

/**
  The `Transform` class is used to serialize and deserialize model
  attributes when they are saved or loaded from an
  adapter. Subclassing `Transform` is useful for creating custom
  attributes. All subclasses of `Transform` must implement a
  `serialize` and a `deserialize` method.

  Example

  ```app/transforms/temperature.js

  // Converts centigrade in the JSON to fahrenheit in the app
  export default class TemperatureTransform {
    deserialize(serialized, options) {
      return (serialized *  1.8) + 32;
    }

    serialize(deserialized, options) {
      return (deserialized - 32) / 1.8;
    }

    static create() {
      return new this();
    }
  }
  ```

  Usage

  ```app/models/requirement.js
  import Model, { attr } from '@ember-data/model';

  export default class RequirementModel extends Model {
    @attr('string') name;
    @attr('temperature') temperature;
  }
  ```

  The options passed into the `attr` function when the attribute is
  declared on the model is also available in the transform.

  ```app/models/post.js
  import Model, { attr } from '@ember-data/model';

  export default class PostModel extends Model {
    @attr('string') title;
    @attr('markdown', {
      markdown: {
        gfm: false,
        sanitize: true
      }
    })
    markdown;
  }
  ```

  ```app/transforms/markdown.js
  export default class MarkdownTransform {
    serialize(deserialized, options) {
      return deserialized.raw;
    }

    deserialize(serialized, options) {
      let markdownOptions = options.markdown || {};

      return marked(serialized, markdownOptions);
    }

    static create() {
      return new this();
    }
  }
  ```

  @class Transform
  @public
 */
/**
  When given a deserialized value from a record attribute this
  method must return the serialized value.

  Example

  ```javascript
  serialize(deserialized, options) {
    return deserialized ? null : Number(deserialized);
  }
  ```

  @method serialize
  @public
  @param deserialized The deserialized value
  @param options hash of options passed to `attr`
  @return The serialized value
*/
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
  @public
  @param serialized The serialized value
  @param options hash of options passed to `attr`
  @return The deserialized value
*/
interface Transform {
  serialize(value: unknown, options: AttributeSchema['options']): unknown;
  deserialize(value: unknown, options: AttributeSchema['options']): unknown;
}
const Transform = EmberObject;

export default Transform;
