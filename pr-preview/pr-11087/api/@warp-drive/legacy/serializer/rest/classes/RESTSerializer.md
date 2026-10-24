---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/legacy/serializer/rest/classes/RESTSerializer.md
---

&#x20;

# &#x20;RESTSerializer

Defined in: [warp-drive-packages/legacy/src/serializer/rest.ts:77](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/serializer/rest.ts#L77)

:::danger
⚠️ **This is LEGACY documentation** for a feature that is no longer encouraged to be used.
If starting a new app or thinking of implementing a new adapter, consider writing a
Handler instead to be used with the [RequestManager](../../../../core/classes/RequestManager.md)
:::

Normally, applications will use the `RESTSerializer` by implementing
the `normalize` method.

This allows you to do whatever kind of munging you need and is
especially useful if your server is inconsistent and you need to
do munging differently for many different kinds of responses.

See the `normalize` documentation for more information.

## Across the Board Normalization

There are also a number of hooks that you might find useful to define
across-the-board rules for your payload. These rules will be useful
if your server is consistent, or if you're building an adapter for
an infrastructure service, like Firebase, and want to encode service
conventions.

For example, if all of your keys are underscored and all-caps, but
otherwise consistent with the names you use in your models, you
can implement across-the-board rules for how to convert an attribute
name in your model to a key in your JSON.

```js [app/serializers/application.js]
import { RESTSerializer } from '@warp-drive/legacy/serializer/rest';
import { underscore } from '<app-name>/utils/string-utils';

export default class ApplicationSerializer extends RESTSerializer {
  keyForAttribute(attr, method) {
    return underscore(attr).toUpperCase();
  }
}
```

You can also implement `keyForRelationship`, which takes the name
of the relationship as the first parameter, the kind of
relationship (`hasMany` or `belongsTo`) as the second parameter, and
the method (`serialize` or `deserialize`) as the third parameter.

RESTSerializer
