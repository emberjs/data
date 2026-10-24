---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/legacy/serializer/transform/classes/Transform.md
description: >-
  Legacy base for custom attribute transforms, which implement `serialize` and
  `deserialize` to convert values between payloads and records. Transform
---

&#x20;

# &#x20;Transform

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/transform.ts:5](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/legacy/src/serializer/-private/transforms/transform.ts#L5)

The `Transform` class is used to serialize and deserialize model
attributes when they are saved or loaded from an
adapter. Subclassing `Transform` is useful for creating custom
attributes. All subclasses of `Transform` must implement a
`serialize` and a `deserialize` method.

Example

```js [app/transforms/temperature.js]

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

```js [app/models/requirement.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class RequirementModel extends Model {
  @attr('string') name;
  @attr('temperature') temperature;
}
```

The options passed into the `attr` function when the attribute is
declared on the model is also available in the transform.

```js [app/models/post.js]
import { Model, attr } from '@warp-drive/legacy/model';

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

```js [app/transforms/markdown.js]
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

## Constructors

### Constructor

```ts
new Transform(owner?: Owner): Transform;
```

#### Parameters

##### owner?

`Owner`

#### Returns

`Transform`
