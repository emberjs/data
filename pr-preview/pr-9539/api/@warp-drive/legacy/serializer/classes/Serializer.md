---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/legacy/serializer/classes/Serializer.md
description: >-
  Legacy abstract base class for serializers that normalize API responses into
  JSON:API and serialize records into the API's request format. Serializer
---

&#x20;

# &#x20;Serializer

Defined in: [warp-drive-packages/legacy/src/serializer.ts:184](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/serializer.ts#L184)

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

## Extends

* `EmberObject`

## Constructors

### Constructor

```ts
new Serializer(owner?: Owner): Serializer;
```

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

Defined in: [warp-drive-packages/legacy/src/serializer.ts:308](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/serializer.ts#L308)

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

Defined in: [warp-drive-packages/legacy/src/serializer.ts:204](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/serializer.ts#L204)

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
