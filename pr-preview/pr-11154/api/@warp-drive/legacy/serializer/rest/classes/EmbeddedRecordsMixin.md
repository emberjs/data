---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/legacy/serializer/rest/classes/EmbeddedRecordsMixin.md
---

&#x20;

# &#x20;EmbeddedRecordsMixin

Defined in: [warp-drive-packages/legacy/src/serializer/-private/embedded-records-mixin.ts:102](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/embedded-records-mixin.ts#L102)

## Using Embedded Records

`EmbeddedRecordsMixin` supports serializing embedded records.

To set up embedded records, include the mixin when extending a serializer,
then define and configure embedded (model) relationships.

Note that embedded records will serialize with the serializer for their model instead of the serializer in which they are defined.

Note also that this mixin does not work with JSONAPISerializer because the JSON:API specification does not describe how to format embedded resources.

Below is an example of a per-type serializer (`post` type).

```js [app/serializers/post.js]
import RESTSerializer, { EmbeddedRecordsMixin } from '@warp-drive/legacy/serializer/rest';

export default class PostSerializer extends RESTSerializer.extend(EmbeddedRecordsMixin) {
  attrs = {
    author: { embedded: 'always' },
    comments: { serialize: 'ids' }
  }
}
```

Note that this use of `{ embedded: 'always' }` is unrelated to
the `{ embedded: 'always' }` that is defined as an option on `attr` as part of
defining a model while working with the `ActiveModelSerializer`.  Nevertheless,
using `{ embedded: 'always' }` as an option to `attr` is not a valid way to set up
embedded records.

The `attrs` option for a resource `{ embedded: 'always' }` is shorthand for:

```js
{
  serialize: 'records',
  deserialize: 'records'
}
```

### Configuring Attrs

A resource's `attrs` option may be set to use `ids`, `records` or false for the
`serialize`  and `deserialize` settings.

The `attrs` property can be set on the `ApplicationSerializer` or a per-type
serializer.

In the case where embedded JSON is expected while extracting a payload (reading)
the setting is `deserialize: 'records'`, there is no need to use `ids` when
extracting as that is the default behaviour without this mixin if you are using
the vanilla `EmbeddedRecordsMixin`. Likewise, to embed JSON in the payload while
serializing `serialize: 'records'` is the setting to use. There is an option of
not embedding JSON in the serialized payload by using `serialize: 'ids'`. If you
do not want the relationship sent at all, you can use `serialize: false`.

### EmbeddedRecordsMixin defaults

If you do not overwrite `attrs` for a specific relationship, the `EmbeddedRecordsMixin`
will behave in the following way:

BelongsTo: `{ serialize: 'id', deserialize: 'id' }`
HasMany:   `{ serialize: false, deserialize: 'ids' }`

### Model Relationships

Embedded records must have a model defined to be extracted and serialized. Note that
when defining any relationships on your model such as `belongsTo` and `hasMany`, you
should not both specify `async: true` and also indicate through the serializer's
`attrs` attribute that the related model should be embedded for deserialization.
If a model is declared embedded for deserialization (`embedded: 'always'` or `deserialize: 'records'`),
then do not use `async: true`.

To successfully extract and serialize embedded records the model relationships
must be set up correctly. See the
[defining relationships](https://guides.emberjs.com/current/models/relationships)
section of the **Defining Models** guide page.

Records without an `id` property are not considered embedded records, model
instances must have an `id` property to be used with Ember Data.

### Example JSON payloads, Models and Serializers

**When customizing a serializer it is important to grok what the customizations
are. Please read the docs for the methods this mixin provides, in case you need
to modify it to fit your specific needs.**

EmbeddedRecordsMixin
