---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/serializer/classes/Serializer.md
---

&#x20;

# &#x20;Serializer

Defined in: [warp-drive-packages/legacy/src/serializer.ts:144](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/serializer.ts#L144)

> ⚠️ CAUTION you likely want the docs for [MinimumSerializerInterface](../../compat/types/MinimumSerializerInterface.md)
> as extending this abstract class is unnecessary.

`Serializer` is an abstract base class that you may override in your
application to customize it for your backend. The minimum set of methods
that you should implement is:

* `normalizeResponse()`
* `serialize()`

And you can optionally override the following methods:

* `normalize()`

For an example implementation, see the included [JSONSerializer](../json/classes/JSONSerializer.md).

Serializer

## Extends

* `EmberObject`

## Constructors

### Constructor

```ts
new Serializer(owner?: Owner): Serializer;
```

Defined in: [node\_modules/.pnpm/ember-source@7.3.0/node\_modules/ember-source/types/stable/@ember/object/index.d.ts:28](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/ember-source@7.3.0/node_modules/ember-source/types/stable/@ember/object/index.d.ts#L28)

#### Parameters

##### owner?

`Owner`

#### Returns

`Serializer`

#### Inherited from

```ts
EmberObject.constructor
```

## Methods

### normalize()

```ts
normalize(_typeClass: ModelSchema, hash: Record<string, unknown>): 
  | EmptyResourceDocument
  | SingleResourceDocument;
```

Defined in: [warp-drive-packages/legacy/src/serializer.ts:268](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/serializer.ts#L268)

The `normalize` method is used to convert a payload received from your
external data source into the normalized form `store.push()` expects. You
should override this method, munge the hash and return the normalized
payload.

Example:

```js
Serializer.extend({
  normalize(modelClass, resourceHash) {
    let data = {
      id:            resourceHash.id,
      type:          modelClass.modelName,
      attributes:    resourceHash
    };
    return { data: data };
  }
})
```

#### Parameters

##### \_typeClass

`ModelSchema`

the model class the hash is being normalized for

##### hash

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

the raw payload hash to normalize

#### Returns

| [`EmptyResourceDocument`](../../../core/types/spec/json-api-raw/types/EmptyResourceDocument.md)
| [`SingleResourceDocument`](../../../core/types/spec/json-api-raw/types/SingleResourceDocument.md)

the normalized resource document

## Properties

### store

```ts
store: Store$1;
```

Defined in: [warp-drive-packages/legacy/src/serializer.ts:164](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/serializer.ts#L164)

The `store` property is the application's `store` that contains
all records. It can be used to look up serializers for other model
types that may be nested inside the payload response.

Example:

```js
Serializer.extend({
  extractRelationship(relationshipModelName, relationshipHash) {
    let modelClass = this.store.modelFor(relationshipModelName);
    let relationshipSerializer = this.store.serializerFor(relationshipModelName);
    return relationshipSerializer.normalize(modelClass, relationshipHash);
  }
});
```
