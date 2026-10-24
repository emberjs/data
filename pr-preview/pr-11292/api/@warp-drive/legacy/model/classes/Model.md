---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/model/classes/Model.md
---

&#x20;

# &#x20;Model

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:91](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L91)

**`No Inherit Doc`** **`Legacy`**

Base class from which Models can be defined.

::: code-group

```js [app/models/user.js]
import { Model, attr, belongsTo, hasMany } from '@warp-drive/legacy/model';

export default class User extends Model {
  @attr name;
  @attr('number') age;
  @hasMany('post', { async: true, inverse: null }) posts;
  @belongsTo('group', { async: false, inverse: 'users' }) group;
}
```

```ts [app/models/user.ts]
import { Model, attr, belongsTo, hasMany, type AsyncHasMany } from '@warp-drive/legacy/model';
import type { NumberTransform } from '@ember-data/serializer/transform';
import type Group from './group';
import type Post from './post';

export default class User extends Model {
  @attr declare name: string;

  @attr<NumberTransform>('number')
  declare age: number;

  @hasMany('post', { async: true, inverse: null })
  declare posts: AsyncHasMany<Post>;

  @belongsTo('group', { async: false, inverse: 'users' })
  declare group: Group | null;
}
```

:::

Models both define the schema for a resource type and provide
the class to use as the reactive object for data of resource
of that type.

## Extends

* `EmberObject`

## Implements

* `MinimalLegacyRecord`

## Methods

### belongsTo()

```ts
belongsTo<T extends Model, K extends string>(this: T, prop: K & K extends _MaybeBelongsToFields<T> ? K : never): BelongsToReference<T, K>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:370](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L370)

Get the reference for the specified belongsTo relationship.

For instance, given the following model

```js [app/models/blog-post.js]
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class BlogPost extends Model {
  @belongsTo('user', { async: true, inverse: null }) author;
}
```

Then the reference for the author relationship would be
retrieved from a record instance like so:

```js
blogPost.belongsTo('author');
```

A `BelongsToReference` is a low-level API that allows access
and manipulation of a belongsTo relationship.

It is especially useful when you're dealing with `async` relationships
as it allows synchronous access to the relationship data if loaded, as
well as APIs for loading, reloading the data or accessing available
information without triggering a load.

It may also be useful when using `sync` relationships that need to be
loaded/reloaded with more precise timing than marking the
relationship as `async` and relying on autofetch would have allowed.

However,keep in mind that marking a relationship as `async: false` will introduce
bugs into your application if the data is not always guaranteed to be available
by the time the relationship is accessed. Ergo, it is recommended when using this
approach to utilize `links` for unloaded relationship state instead of identifiers.

Reference APIs are entangled with the relationship's underlying state,
thus any getters or cached properties that utilize these will properly
invalidate if the relationship state changes.

References are "stable", meaning that multiple calls to retrieve the reference
for a given relationship will always return the same HasManyReference.

#### Type Parameters

##### T

`T` *extends* `Model`

##### K

`K` *extends* `string`

#### Parameters

##### this

`T`

##### prop

`K` & `K` *extends* `_MaybeBelongsToFields`<`T`> ? `K` : `never`

the name of the relationship

#### Returns

`BelongsToReference`<`T`, `K`>

reference for this relationship

***

### changedAttributes()

```ts
changedAttributes<T extends MinimalLegacyRecord>(this: T): ChangedAttributesHash;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:219](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L219)

Returns an object, whose keys are changed properties, and value is
an \[oldProp, newProp] array.

The array represents the diff of the canonical state with the local state
of the model. Note: if the model is created locally, the canonical state is
empty since the adapter hasn't acknowledged the attributes yet:

Example

```js [app/models/mascot.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class MascotModel extends Model {
  @attr('string') name;
  @attr('boolean', {
    defaultValue: false
  })
  isAdmin;
}
```

```javascript
let mascot = store.createRecord('mascot');

mascot.changedAttributes(); // {}

mascot.set('name', 'Tomster');
mascot.changedAttributes(); // { name: [undefined, 'Tomster'] }

mascot.set('isAdmin', true);
mascot.changedAttributes(); // { isAdmin: [undefined, true], name: [undefined, 'Tomster'] }

mascot.save().then(function() {
  mascot.changedAttributes(); // {}

  mascot.set('isAdmin', false);
  mascot.changedAttributes(); // { isAdmin: [true, false] }
});
```

#### Type Parameters

##### T

`T` *extends* `MinimalLegacyRecord`

#### Parameters

##### this

`T`

#### Returns

`ChangedAttributesHash`

an object, whose keys are changed properties,
and value is an \[oldProp, newProp] array.

***

### deleteRecord()

```ts
deleteRecord<T extends MinimalLegacyRecord>(this: T): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:454](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L454)

Marks the record as deleted but does not save it. You must call
`save` afterwards if you want to persist it. You might use this
method if you want to allow the user to still `rollbackAttributes()`
after a delete was made.

Example

```js
import Component from '@glimmer/component';

export default class extends Component {
  softDelete = () => {
    this.args.model.deleteRecord();
  }

  confirm = () => {
    this.args.model.save();
  }

  undo = () => {
    this.args.model.rollbackAttributes();
  }
}
```

#### Type Parameters

##### T

`T` *extends* `MinimalLegacyRecord`

#### Parameters

##### this

`T`

#### Returns

`void`

***

### destroyRecord()

```ts
destroyRecord<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<Model>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:164](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L164)

Same as `deleteRecord`, but saves the record immediately.

Example

```js
import Component from '@glimmer/component';

export default class extends Component {
  delete = () => {
    this.args.model.destroyRecord().then(function() {
      this.transitionToRoute('model.index');
    });
  }
}
```

If you pass an object on the `adapterOptions` property of the options
argument it will be passed to your adapter via the snapshot

```js
record.destroyRecord({ adapterOptions: { subscribe: false } });
```

```js [app/adapters/post.js]
import MyCustomAdapter from './custom-adapter';

export default class PostAdapter extends MyCustomAdapter {
  deleteRecord(store, type, snapshot) {
    if (snapshot.adapterOptions.subscribe) {
      // ...
    }
    // ...
  }
}
```

#### Type Parameters

##### T

`T` *extends* `MinimalLegacyRecord`

#### Parameters

##### this

`T`

##### options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`Model`>

a promise that will be resolved when the adapter returns
successfully or rejected if the adapter returns with an error.

***

### eachAttribute()

```ts
eachAttribute<T>(callback: (this: 
  | NoInfer<T>
  | undefined, key: string, meta: LegacyAttributeField) => void, binding?: T): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1067](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1067)

Iterates over the attributes defined on this record's class, calling
`callback` for each one. See [the static eachAttribute](#eachattribute-1).

#### Type Parameters

##### T

`T`

#### Parameters

##### callback

(`this`:
| [`NoInfer`](https://www.typescriptlang.org/docs/handbook/utility-types.html#noinfertype)<`T`>
| `undefined`, `key`: `string`, `meta`: [`LegacyAttributeField`](../../../core/types/schema/fields/types/LegacyAttributeField.md)) => `void`

the callback to invoke

##### binding?

`T`

the value to which the callback's `this` should be bound

#### Returns

`void`

***

### eachRelationship()

```ts
eachRelationship<T>(callback: (this: 
  | NoInfer<T>
  | undefined, key: string, meta: LegacyRelationshipField) => void, binding?: T): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1038](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1038)

Given a callback, iterates over each of the relationships in the model,
invoking the callback with the name of each relationship and its relationship
descriptor.

The callback method you provide should have the following signature (all
parameters are optional):

```javascript
function(name, descriptor);
```

* `name` the name of the current property in the iteration
* `descriptor` the meta object that describes this relationship

The relationship descriptor argument is an object with the following properties.

* **name** String the name of this relationship on the Model
* **kind** String "hasMany" or "belongsTo"
* **options** Object the original options hash passed when the relationship was declared
* **parentType** Model the type of the Model that owns this relationship
* **type** String the type name of the related Model

Note that in addition to a callback, you can also pass an optional target
object that will be set as `this` on the context.

Example

```js [app/serializers/application.js]
import JSONSerializer from '@ember-data/serializer/json';

export default class ApplicationSerializer extends JSONSerializer {
   serialize(record, options) {
   let json = {};

   record.eachRelationship(function(name, descriptor) {
     if (descriptor.kind === 'hasMany') {
       let serializedHasManyName = name.toUpperCase() + '_IDS';
       json[serializedHasManyName] = record.get(name).map(r => r.id);
     }
   });

   return json;
 }
}
```

#### Type Parameters

##### T

`T`

#### Parameters

##### callback

(`this`:
| [`NoInfer`](https://www.typescriptlang.org/docs/handbook/utility-types.html#noinfertype)<`T`>
| `undefined`, `key`: `string`, `meta`: [`LegacyRelationshipField`](../../../core/types/schema/fields/types/LegacyRelationshipField.md)) => `void`

the callback to invoke

##### binding?

`T`

the value to which the callback's `this` should be bound

#### Returns

`void`

***

### hasMany()

```ts
hasMany<T extends MinimalLegacyRecord, K extends string>(this: T, prop: K): HasManyReference<T, K>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:424](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L424)

Get the reference for the specified hasMany relationship.

For instance, given the following model

```js [app/models/blog-post.js]
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class BlogPost extends Model {
  @hasMany('comment', { async: true, inverse: null }) comments;
}
```

Then the reference for the comments relationship would be
retrieved from a record instance like so:

```js
blogPost.hasMany('comments');
```

A `HasManyReference` is a low-level API that allows access
and manipulation of a hasMany relationship.

It is especially useful when you are dealing with `async` relationships
as it allows synchronous access to the relationship data if loaded, as
well as APIs for loading, reloading the data or accessing available
information without triggering a load.

It may also be useful when using `sync` relationships with `@ember-data/model`
that need to be loaded/reloaded with more precise timing than marking the
relationship as `async` and relying on autofetch would have allowed.

However,keep in mind that marking a relationship as `async: false` will introduce
bugs into your application if the data is not always guaranteed to be available
by the time the relationship is accessed. Ergo, it is recommended when using this
approach to utilize `links` for unloaded relationship state instead of identifiers.

Reference APIs are entangled with the relationship's underlying state,
thus any getters or cached properties that utilize these will properly
invalidate if the relationship state changes.

References are "stable", meaning that multiple calls to retrieve the reference
for a given relationship will always return the same HasManyReference.

#### Type Parameters

##### T

`T` *extends* `MinimalLegacyRecord`

##### K

`K` *extends* `string`

#### Parameters

##### this

`T`

##### prop

`K`

the name of the relationship

#### Returns

`HasManyReference`<`T`, `K`>

reference for this relationship

***

### inverseFor()

```ts
inverseFor(name: string): 
  | LegacyRelationshipField
  | null;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1056](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1056)

Returns the inverse relationship schema for the given relationship
name, if one exists. See [the static inverseFor](#inversefor-1).

#### Parameters

##### name

`string`

#### Returns

| [`LegacyRelationshipField`](../../../core/types/schema/fields/types/LegacyRelationshipField.md)
| `null`

***

### notifyPropertyChange()

```ts
notifyPropertyChange(prop: string): this;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:972](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L972)

Convenience method to call `propertyWillChange` and `propertyDidChange` in
succession.

Notify the observer system that a property has just changed.

Sometimes you need to change a value directly or indirectly without
actually calling `get()` or `set()` on it. In this case, you can use this
method instead. Calling this method will notify all observers that the
property has potentially changed value.

#### Parameters

##### prop

`string`

#### Returns

`this`

#### Method

notifyPropertyChange

***

### relationshipFor()

```ts
relationshipFor(name: string): 
  | LegacyRelationshipField
  | undefined;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1048](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1048)

Returns the relationship schema for the given relationship name, if any.

#### Parameters

##### name

`string`

#### Returns

| [`LegacyRelationshipField`](../../../core/types/schema/fields/types/LegacyRelationshipField.md)
| `undefined`

***

### reload()

```ts
reload<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<T>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:314](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L314)

Reload the record from the adapter.

This will only work if the record has already finished loading.

Example

```js
import Component from '@glimmer/component';

export default class extends Component {
  async reload = () => {
    await this.args.model.reload();
    // do something with the reloaded model
  }
}
```

#### Type Parameters

##### T

`T` *extends* `MinimalLegacyRecord`

#### Parameters

##### this

`T`

##### options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

optional, may include `adapterOptions` hash which will be passed to adapter request

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T`>

a promise that will be resolved with the record when the
adapter returns successfully or rejected if the adapter returns
with an error.

***

### rollbackAttributes()

```ts
rollbackAttributes<T extends MinimalLegacyRecord>(this: T): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:238](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L238)

If the model `hasDirtyAttributes` this function will discard any unsaved
changes. If the model `isNew` it will be removed from the store.

Example

```javascript
record.name; // 'Untitled Document'
record.set('name', 'Doc 1');
record.name; // 'Doc 1'
record.rollbackAttributes();
record.name; // 'Untitled Document'
```

#### Type Parameters

##### T

`T` *extends* `MinimalLegacyRecord`

#### Parameters

##### this

`T`

#### Returns

`void`

***

### ~~save()~~&#x20;

```ts
save<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<Model>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:286](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L286)

Save the record and persist any changes to the record to an
external source via the adapter.

Example

```javascript
record.set('name', 'Tomster');
record.save().then(function() {
  // Success callback
}, function() {
  // Error callback
});
```

If you pass an object using the `adapterOptions` property of the options
argument it will be passed to your adapter via the snapshot.

```js
record.save({ adapterOptions: { subscribe: false } });
```

```js [app/adapters/post.js]
import MyCustomAdapter from './custom-adapter';

export default class PostAdapter extends MyCustomAdapter {
  updateRecord(store, type, snapshot) {
    if (snapshot.adapterOptions.subscribe) {
      // ...
    }
    // ...
  }
}
```

#### Type Parameters

##### T

`T` *extends* `MinimalLegacyRecord`

#### Parameters

##### this

`T`

##### options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`Model`>

a promise that will be resolved when the adapter returns
successfully or rejected if the adapter returns with an error.

#### Deprecated

use Store.request instead

***

### serialize()

```ts
serialize<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): unknown;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:120](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L120)

Create a JSON representation of the record, using the serialization
strategy of the store's adapter.

`serialize` takes an optional hash as a parameter, currently
supported options are:

* `includeId`: `true` if the record's ID should be included in the
  JSON representation.

#### Type Parameters

##### T

`T` *extends* `MinimalLegacyRecord`

#### Parameters

##### this

`T`

##### options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

`unknown`

an object whose values are primitive JSON values only

***

### toString()

```ts
toString(): string;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:853](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L853)

Returns a string representation which attempts to provide more information
than Javascript's `toString` typically does, in a generic way for all Ember
objects.

```javascript
import EmberObject from '@ember/object';

const Person = EmberObject.extend();
person = Person.create();
person.toString(); //=> "<Person:ember1024>"
```

If the object's class is not defined on an Ember namespace, it will
indicate it is a subclass of the registered superclass:

```javascript
const Student = Person.extend();
let student = Student.create();
student.toString(); //=> "<(subclass of Person):ember1025>"
```

If the method `toStringExtension` is defined, its return value will be
included in the output.

```javascript
const Teacher = Person.extend({
  toStringExtension() {
    return this.get('fullName');
  }
});
teacher = Teacher.create();
teacher.toString(); //=> "<Teacher:ember1026:Tom Dale>"
```

#### Returns

`string`

string representation

#### Method

toString

***

### unloadRecord()

```ts
unloadRecord<T extends MinimalLegacyRecord>(this: T): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:172](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L172)

Unloads the record from the store. This will not send a delete request
to your server, it just unloads the record from memory.

#### Type Parameters

##### T

`T` *extends* `MinimalLegacyRecord`

#### Parameters

##### this

`T`

#### Returns

`void`

***

### eachAttribute()

```ts
static eachAttribute<T, Schema extends Model>(callback: (this: T | undefined, key: MaybeAttrFields<Schema>, attribute: LegacyAttributeField) => void, binding?: T): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1820](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1820)

Iterates through the attributes of the model, calling the passed function on each
attribute.

The callback method you provide should have the following signature (all
parameters are optional):

```javascript
function(name, meta);
```

* `name` the name of the current property in the iteration
* `meta` the meta object for the attribute property in the iteration

Note that in addition to a callback, you can also pass an optional target
object that will be set as `this` on the context.

Example

```javascript
import { Model, attr } from '@warp-drive/legacy/model';

class PersonModel extends Model {
   @attr('string') firstName;
   @attr('string') lastName;
   @attr('date') birthday;
 }

PersonModel.eachAttribute(function(name, meta) {
   // do thing
 });

// prints:
// firstName {type: "string", kind: 'attribute', options: Object, parentType: function, name: "firstName"}
// lastName {type: "string", kind: 'attribute', options: Object, parentType: function, name: "lastName"}
// birthday {type: "date", kind: 'attribute', options: Object, parentType: function, name: "birthday"}
```

#### Type Parameters

##### T

`T`

##### Schema

`Schema` *extends* `Model`

#### Parameters

##### callback

(`this`: `T` | `undefined`, `key`: `MaybeAttrFields`<`Schema`>, `attribute`: [`LegacyAttributeField`](../../../core/types/schema/fields/types/LegacyAttributeField.md)) => `void`

The callback to execute

##### binding?

`T`

\[optional] the value to which the callback's `this` should be bound

#### Returns

`void`

***

### eachRelatedType()

```ts
static eachRelatedType<T>(callback: (this: T | undefined, type: string) => void, binding?: T): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1618](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1618)

Given a callback, iterates over each of the types related to a model,
invoking the callback with the related type's class. Each type will be
returned just once, regardless of how many different relationships it has
with a model.

#### Type Parameters

##### T

`T`

#### Parameters

##### callback

(`this`: `T` | `undefined`, `type`: `string`) => `void`

the callback to invoke

##### binding?

`T`

the value to which the callback's `this` should be bound

#### Returns

`void`

***

### eachRelationship()

```ts
static eachRelationship<T, Schema extends Model>(callback: (this: T | undefined, key: MaybeRelationshipFields<Schema>, relationship: LegacyRelationshipField) => void, binding?: T): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1590](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1590)

Given a callback, iterates over each of the relationships in the model,
invoking the callback with the name of each relationship and its relationship
descriptor.

#### Type Parameters

##### T

`T`

##### Schema

`Schema` *extends* `Model`

#### Parameters

##### callback

(`this`: `T` | `undefined`, `key`: `MaybeRelationshipFields`<`Schema`>, `relationship`: [`LegacyRelationshipField`](../../../core/types/schema/fields/types/LegacyRelationshipField.md)) => `void`

the callback to invoke

##### binding?

`T`

the value to which the callback's `this` should be bound

#### Returns

`void`

***

### eachTransformedAttribute()

```ts
static eachTransformedAttribute<T, Schema extends Model>(callback: (this: T | undefined, key: Exclude<keyof Schema & string, 
  | "deleteRecord"
  | "_debugContainerKey"
  | "_super"
  | "addObserver"
  | "cacheFor"
  | "concatenatedProperties"
  | "decrementProperty"
  | "destroy"
  | "get"
  | "getProperties"
  | "incrementProperty"
  | "init"
  | "isDestroyed"
  | "isDestroying"
  | "mergedProperties"
  | "notifyPropertyChange"
  | "removeObserver"
  | "reopen"
  | "set"
  | "setProperties"
  | "toggleProperty"
  | "toString"
  | "willDestroy"
  | "___(unique) Symbol(Store)"
  | "___private_notifications"
  | "___recordState"
  | "_createSnapshot"
  | "adapterError"
  | "attr"
  | "belongsTo"
  | "changedAttributes"
  | "currentState"
  | "destroyRecord"
  | "dirtyType"
  | "eachAttribute"
  | "eachRelationship"
  | "errors"
  | "hasDirtyAttributes"
  | "hasMany"
  | "inverseFor"
  | "isDeleted"
  | "isEmpty"
  | "isError"
  | "isLoaded"
  | "isLoading"
  | "isNew"
  | "isReloading"
  | "isSaving"
  | "isValid"
  | "relationshipFor"
  | "reload"
  | "rollbackAttributes"
  | "save"
  | "serialize"
  | "store"
  | "unloadRecord"
  | "id"
  | "_isReloading">, type: string) => void, binding?: T): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1877](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1877)

Iterates through the transformedAttributes of the model, calling
the passed function on each attribute. Note the callback will not be
called for any attributes that do not have an transformation type.

The callback method you provide should have the following signature (all
parameters are optional):

```javascript
function(name, type);
```

* `name` the name of the current property in the iteration
* `type` a string containing the name of the type of transformed
  applied to the attribute

Note that in addition to a callback, you can also pass an optional target
object that will be set as `this` on the context.

Example

```javascript
import { Model, attr } from '@warp-drive/legacy/model';

let Person = Model.extend({
   firstName: attr(),
   lastName: attr('string'),
   birthday: attr('date')
 });

Person.eachTransformedAttribute(function(name, type) {
   // do thing
 });

// prints:
// lastName string
// birthday date
```

#### Type Parameters

##### T

`T`

##### Schema

`Schema` *extends* `Model`

#### Parameters

##### callback

(`this`: `T` | `undefined`, `key`: [`Exclude`](https://www.typescriptlang.org/docs/handbook/utility-types.html#excludeuniontype-excludedmembers)\<keyof `Schema` & `string`,
| `"deleteRecord"`
| `"_debugContainerKey"`
| `"_super"`
| `"addObserver"`
| `"cacheFor"`
| `"concatenatedProperties"`
| `"decrementProperty"`
| `"destroy"`
| `"get"`
| `"getProperties"`
| `"incrementProperty"`
| `"init"`
| `"isDestroyed"`
| `"isDestroying"`
| `"mergedProperties"`
| `"notifyPropertyChange"`
| `"removeObserver"`
| `"reopen"`
| `"set"`
| `"setProperties"`
| `"toggleProperty"`
| `"toString"`
| `"willDestroy"`
| `"___(unique) Symbol(Store)"`
| `"___private_notifications"`
| `"___recordState"`
| `"_createSnapshot"`
| `"adapterError"`
| `"attr"`
| `"belongsTo"`
| `"changedAttributes"`
| `"currentState"`
| `"destroyRecord"`
| `"dirtyType"`
| `"eachAttribute"`
| `"eachRelationship"`
| `"errors"`
| `"hasDirtyAttributes"`
| `"hasMany"`
| `"inverseFor"`
| `"isDeleted"`
| `"isEmpty"`
| `"isError"`
| `"isLoaded"`
| `"isLoading"`
| `"isNew"`
| `"isReloading"`
| `"isSaving"`
| `"isValid"`
| `"relationshipFor"`
| `"reload"`
| `"rollbackAttributes"`
| `"save"`
| `"serialize"`
| `"store"`
| `"unloadRecord"`
| `"id"`
| `"_isReloading"`>, `type`: `string`) => `void`

The callback to execute

##### binding?

`T`

\[optional] the value to which the callback's `this` should be bound

#### Returns

`void`

***

### inverseFor()

```ts
static inverseFor(name: string, store: Store$1): 
  | LegacyRelationshipField
  | null;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1204](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1204)

Find the relationship which is the inverse of the one asked for.

For example, if you define models like this:

```js [app/models/post.js]
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class PostModel extends Model {
   @hasMany('message') comments;
 }
```

```js [app/models/message.js]
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class MessageModel extends Model {
   @belongsTo('post') owner;
 }
```

```js
store.modelFor('post').inverseFor('comments', store) // { type: 'message', name: 'owner', kind: 'belongsTo' }
store.modelFor('message').inverseFor('owner', store) // { type: 'post', name: 'comments', kind: 'hasMany' }
```

#### Parameters

##### name

`string`

the name of the relationship

##### store

`Store$1`

#### Returns

| [`LegacyRelationshipField`](../../../core/types/schema/fields/types/LegacyRelationshipField.md)
| `null`

the inverse relationship, or null

***

### toString()

```ts
static toString(): string;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1896](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1896)

Returns the name of the model class.

#### Returns

`string`

***

### typeForRelationship()

```ts
static typeForRelationship(name: string, store: Store$1): ModelSchema<unknown> | undefined;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1150](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1150)

For a given relationship name, returns the model type of the relationship.

For example, if you define a model like this:

```js [app/models/post.js]
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class PostModel extends Model {
  @hasMany('comment') comments;
}
```

Calling `store.modelFor('post').typeForRelationship('comments', store)` will return `Comment`.

#### Parameters

##### name

`string`

the name of the relationship

##### store

`Store$1`

an instance of Store

#### Returns

`ModelSchema`<`unknown`> | `undefined`

the type of the relationship, or undefined

## Properties

### isReloading

```ts
isReloading: boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:800](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L800)

If `true` the store is attempting to reload the record from the adapter.

Example

```javascript
record.isReloading; // false
record.reload();
record.isReloading; // true
```

***

### store

```ts
store: Store$1;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:96](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L96)

The store service instance which created this record instance

***

### modelName

```ts
static modelName: string;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1111](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1111)

Represents the model's class name as a string. This can be used to look up the model's class name through
`Store`'s modelFor method.

`modelName` is generated for you by WarpDrive. It will be a lowercased, dasherized string.
For example:

```javascript
store.modelFor('post').modelName; // 'post'
store.modelFor('blog-post').modelName; // 'blog-post'
```

The most common place you'll want to access `modelName` is in your serializer's `payloadKeyFromModelName` method. For example, to change payload
keys to underscore (instead of dasherized), you might use the following code:

```javascript
import RESTSerializer from '@ember-data/serializer/rest';
import { underscore } from '<app-name>/utils/string-utils';

export default const PostSerializer = RESTSerializer.extend({
  payloadKeyFromModelName(modelName) {
    return underscore(modelName);
  }
});
```

### adapterError

#### Get Signature

```ts
get adapterError(): unknown;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:953](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L953)

This property holds the `AdapterError` object with which
last adapter operation was rejected.

##### Returns

`unknown`

#### Set Signature

```ts
set adapterError(v: unknown): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:959](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L959)

`adapterError` is read-only and cannot be set directly.

##### Parameters

###### v

`unknown`

##### Returns

`void`

***

### currentState

#### Set Signature

```ts
set currentState(_v: RecordState): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:878](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L878)

`currentState` is read-only and cannot be set directly.

##### Parameters

###### \_v

`RecordState`

##### Returns

`void`

***

### dirtyType

#### Get Signature

```ts
get dirtyType(): "" | "updated" | "deleted" | "created";
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:753](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L753)

If the record is in the dirty state this property will report what
kind of change has caused it to move into the dirty
state. Possible values are:

* `created` The record has been created by the client and not yet saved to the adapter.
* `updated` The record has been updated by the client and not yet saved to the adapter.
* `deleted` The record has been deleted by the client and not yet saved to the adapter.

Example

```javascript
let record = store.createRecord('model');
record.dirtyType; // 'created'
```

##### Returns

`""` | `"updated"` | `"deleted"` | `"created"`

***

### errors

#### Get Signature

```ts
get errors(): Errors;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:940](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L940)

When the record is in the `invalid` state this object will contain
any errors returned by the adapter. When present the errors hash
contains keys corresponding to the invalid property names
and values which are arrays of Javascript objects with two keys:

* `message` A string containing the error message from the backend
* `attribute` The name of the property associated with this error message

```javascript
record.errors.length; // 0
record.set('foo', 'invalid value');
record.save().catch(function() {
  record.errors.foo;
  // [{message: 'foo should be a number.', attribute: 'foo'}]
});
```

The `errors` property is useful for displaying error messages to
the user.

```handlebars
<label>Username: <Input @value={{@model.username}} /> </label>
{{#each @model.errors.username as |error|}}
  <div class="error">
    {{error.message}}
  </div>
{{/each}}
<label>Email: <Input @value={{@model.email}} /> </label>
{{#each @model.errors.email as |error|}}
  <div class="error">
    {{error.message}}
  </div>
{{/each}}
```

You can also access the special `messages` property on the error
object to get an array of all the error strings.

```handlebars
{{#each @model.errors.messages as |message|}}
  <div class="error">
    {{message}}
  </div>
{{/each}}
```

##### Returns

`Errors`

***

### hasDirtyAttributes

#### Get Signature

```ts
get hasDirtyAttributes(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:628](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L628)

If this property is `true` the record is in the `dirty` state. The
record has local changes that have not yet been saved by the
adapter. This includes records that have been created (but not yet
saved) or deleted.

Example

```javascript
let record = store.createRecord('model');
record.hasDirtyAttributes; // true

const { content: { data: model } } = await store.request(findRecord({ type: 'model', id: '1' }));

model.hasDirtyAttributes; // false
model.foo = 'some value';
model.hasDirtyAttributes; // true
```

##### Returns

`boolean`

***

### id

#### Get Signature

```ts
get id(): string | null;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:820](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L820)

All ember models have an id property. This is an identifier
managed by an external source. These are always coerced to be
strings before being used internally. Note when declaring the
attributes for a model it is an error to declare an id
attribute.

```javascript
let record = store.createRecord('model');
record.id; // null

const { content: { data: model } } = await store.request(findRecord({ type: 'model', id: '1' }));
model.id; // '1'
```

##### Returns

`string` | `null`

#### Set Signature

```ts
set id(id: string | null): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:837](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L837)

Assigns the resource's primary key. Typically only used internally
when a client-created record is assigned an id upon being saved.

##### Parameters

###### id

`string` | `null`

##### Returns

`void`

***

### isDeleted

#### Get Signature

```ts
get isDeleted(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:693](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L693)

If this property is `true` the record is in the `deleted` state
and has been marked for deletion. When `isDeleted` is true and
`hasDirtyAttributes` is true, the record is deleted locally but the deletion
was not yet persisted. When `isSaving` is true, the change is
in-flight. When both `hasDirtyAttributes` and `isSaving` are false, the
change has persisted.

Example

```javascript
let record = store.createRecord('model');
record.isDeleted;    // false
record.deleteRecord();

// Locally deleted
record.isDeleted;           // true
record.hasDirtyAttributes;  // true
record.isSaving;            // false

// Persisting the deletion
let promise = record.save();
record.isDeleted;    // true
record.isSaving;     // true

// Deletion Persisted
promise.then(function() {
  record.isDeleted;          // true
  record.isSaving;           // false
  record.hasDirtyAttributes; // false
});
```

##### Returns

`boolean`

***

### isEmpty

#### Get Signature

```ts
get isEmpty(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:565](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L565)

If this property is `true` the record is in the `empty`
state. Empty is the first state all records enter after they have
been created. Most records created by the store will quickly
transition to the `loading` state if data needs to be fetched from
the server or the `created` state if the record is created on the
client. A record can also enter the empty state if the adapter is
unable to locate the record.

##### Returns

`boolean`

***

### isError

#### Get Signature

```ts
get isError(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:775](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L775)

If `true` the adapter reported that it was unable to save local
changes to the backend for any reason other than a server-side
validation error.

Example

```javascript
record.isError; // false
record.set('foo', 'valid value');
record.save().then(null, function() {
  record.isError; // true
});
```

##### Returns

`boolean`

#### Set Signature

```ts
set isError(v: boolean): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:781](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L781)

`isError` is read-only and cannot be set directly.

##### Parameters

###### v

`boolean`

##### Returns

`void`

***

### isLoaded

#### Get Signature

```ts
get isLoaded(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:601](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L601)

If this property is `true` the record is in the `loaded` state. A
record enters this state when its data is populated. Most of a
record's lifecycle is spent inside substates of the `loaded`
state.

Example

```javascript
let record = store.createRecord('model');
record.isLoaded; // true

const { content: { data: model } } = await store.request(findRecord({ type: 'model', id: '1' }));
model.isLoaded;
```

##### Returns

`boolean`

***

### isLoading

#### Get Signature

```ts
get isLoading(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:578](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L578)

If this property is `true` the record is in the `loading` state. A
record enters this state when the store asks the adapter for its
data. It remains in this state until the adapter provides the
requested data.

##### Returns

`boolean`

***

### isNew

#### Get Signature

```ts
get isNew(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:717](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L717)

If this property is `true` the record is in the `new` state. A
record will be in the `new` state when it has been created on the
client and the adapter has not yet report that it was successfully
saved.

Example

```javascript
let record = store.createRecord('model');
record.isNew; // true

record.save().then(function(model) {
  model.isNew; // false
});
```

##### Returns

`boolean`

***

### isSaving

#### Get Signature

```ts
get isSaving(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:653](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L653)

If this property is `true` the record is in the `saving` state. A
record enters the saving state when `save` is called, but the
adapter has not yet acknowledged that the changes have been
persisted to the backend.

Example

```javascript
let record = store.createRecord('model');
record.isSaving; // false
let promise = record.save();
record.isSaving; // true
promise.then(function() {
  record.isSaving; // false
});
```

##### Returns

`boolean`

***

### isValid

#### Get Signature

```ts
get isValid(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:730](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L730)

If this property is `true` the record is in the `valid` state.

A record will be in the `valid` state when the adapter did not report any
server-side validation failures.

##### Returns

`boolean`

***

### attributes

#### Get Signature

```ts
get static attributes(): Map<string, LegacyAttributeField>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1700](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1700)

A map whose keys are the attributes of the model (properties
described by attr) and whose values are the meta object for the
property.

Example

```js [app/models/person.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class PersonModel extends Model {
   @attr('string') firstName;
   @attr('string') lastName;
   @attr('date') birthday;
 }
```

```javascript
import Person from 'app/models/person'

let attributes = Person.attributes

attributes.forEach(function(meta, name) {
   // do thing
 });

// prints:
// firstName {type: "string", kind: 'attribute', options: Object, parentType: function, name: "firstName"}
// lastName {type: "string", kind: 'attribute', options: Object, parentType: function, name: "lastName"}
// birthday {type: "date", kind: 'attribute', options: Object, parentType: function, name: "birthday"}
```

##### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`, [`LegacyAttributeField`](../../../core/types/schema/fields/types/LegacyAttributeField.md)>

***

### fields

#### Get Signature

```ts
get static fields(): Map<string, "belongsTo" | "hasMany" | "attribute">;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1563](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1563)

A map whose keys are the fields of the model and whose values are strings
describing the kind of the field. A model's fields are the union of all of its
attributes and relationships.

For example:

```js [app/models/blog.js]
import { Model, attr, belongsTo, hasMany } from '@warp-drive/legacy/model';

export default class BlogModel extends Model {
   @hasMany('user') users;
   @belongsTo('user') owner;

   @hasMany('post') posts;

   @attr('string') title;
 }
```

```js
import Blog from 'app/models/blog'

let fields = Blog.fields;
fields.forEach(function(kind, field) {
   // do thing
 });

// prints:
// users, hasMany
// owner, belongsTo
// posts, hasMany
// title, attribute
```

##### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`, `"belongsTo"` | `"hasMany"` | `"attribute"`>

***

### inverseMap

#### Get Signature

```ts
get static inverseMap(): Record<string, 
  | LegacyRelationshipField
| null>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1165](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1165)

A cache of resolved inverse relationships by name, populated lazily by
[inverseFor](#inversefor-1).

##### Returns

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`,
| [`LegacyRelationshipField`](../../../core/types/schema/fields/types/LegacyRelationshipField.md)
| `null`>

***

### relatedTypes

#### Get Signature

```ts
get static relatedTypes(): string[];
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1415](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1415)

An array of types directly related to a model. Each type will be
included once, regardless of the number of relationships it has with
the model.

For example, given a model with this definition:

```js [app/models/blog.js]
import { Model, belongsTo, hasMany } from '@warp-drive/legacy/model';

export default class BlogModel extends Model {
   @hasMany('user') users;
   @belongsTo('user') owner;

   @hasMany('post') posts;
 }
```

This property would contain the following:

```javascript
import Blog from 'app/models/blog';

let relatedTypes = Blog.relatedTypes');
//=> ['user', 'post']
```

##### Returns

`string`\[]

***

### relationshipNames

#### Get Signature

```ts
get static relationshipNames(): {
  belongsTo: string[];
  hasMany: string[];
};
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1357](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1357)

A hash containing lists of the model's relationships, grouped
by the relationship kind. For example, given a model with this
definition:

```js [app/models/blog.js]
import { Model, belongsTo, hasMany } from '@warp-drive/legacy/model';

export default class BlogModel extends Model {
   @hasMany('user') users;
   @belongsTo('user') owner;

   @hasMany('post') posts;
 }
```

This property would contain the following:

```javascript
import Blog from 'app/models/blog';

let relationshipNames = Blog.relationshipNames;
relationshipNames.hasMany;
//=> ['users', 'posts']
relationshipNames.belongsTo;
//=> ['owner']
```

##### Returns

###### belongsTo

```ts
belongsTo: string[];
```

the names of the model's `belongsTo` relationships

###### hasMany

```ts
hasMany: string[];
```

the names of the model's `hasMany` relationships

***

### relationships

#### Get Signature

```ts
get static relationships(): Map<string, LegacyRelationshipField[]>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1303](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1303)

The model's relationships as a map, keyed on the type of the
relationship. The value of each entry is an array containing a descriptor
for each relationship with that type, describing the name of the relationship
as well as the type.

For example, given the following model definition:

```js [app/models/blog.js]
import { Model, belongsTo, hasMany } from '@warp-drive/legacy/model';

export default class BlogModel extends Model {
   @hasMany('user') users;
   @belongsTo('user') owner;
   @hasMany('post') posts;
 }
```

This computed property would return a map describing these
relationships, like this:

```javascript
import Blog from 'app/models/blog';
import User from 'app/models/user';
import Post from 'app/models/post';

let relationships = Blog.relationships;
relationships.user;
//=> [ { name: 'users', kind: 'hasMany' },
//     { name: 'owner', kind: 'belongsTo' } ]
relationships.post;
//=> [ { name: 'posts', kind: 'hasMany' } ]
```

##### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`, [`LegacyRelationshipField`](../../../core/types/schema/fields/types/LegacyRelationshipField.md)\[]>

***

### relationshipsByName

#### Get Signature

```ts
get static relationshipsByName(): Map<string, LegacyRelationshipField>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1474](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1474)

A map whose keys are the relationships of a model and whose values are
relationship descriptors.

For example, given a model with this
definition:

```js [app/models/blog.js]
import { Model, belongsTo, hasMany } from '@warp-drive/legacy/model';

export default class BlogModel extends Model {
   @hasMany('user') users;
   @belongsTo('user') owner;

   @hasMany('post') posts;
 }
```

This property would contain the following:

```javascript
import Blog from 'app/models/blog';

let relationshipsByName = Blog.relationshipsByName;
relationshipsByName.users;
//=> { name: 'users', kind: 'hasMany', type: 'user', options: Object }
relationshipsByName.owner;
//=> { name: 'owner', kind: 'belongsTo', type: 'user', options: Object }
```

##### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`, [`LegacyRelationshipField`](../../../core/types/schema/fields/types/LegacyRelationshipField.md)>

***

### relationshipsObject

#### Get Signature

```ts
get static relationshipsObject(): Record<string, LegacyRelationshipField>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1499](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1499)

A hash of the model's relationship schemas keyed by relationship name.
See also [relationshipsByName](#relationshipsbyname), which
provides the same information as a `Map`.

##### Returns

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, [`LegacyRelationshipField`](../../../core/types/schema/fields/types/LegacyRelationshipField.md)>

***

### transformedAttributes

#### Get Signature

```ts
get static transformedAttributes(): Map<string, string>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1761](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1761)

A map whose keys are the attributes of the model (properties
described by attr) and whose values are type of transformation
applied to each attribute. This map does not include any
attributes that do not have an transformation type.

Example

```js [app/models/person.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class PersonModel extends Model {
   @attr firstName;
   @attr('string') lastName;
   @attr('date') birthday;
 }
```

```javascript
import Person from 'app/models/person';

let transformedAttributes = Person.transformedAttributes

transformedAttributes.forEach(function(field, type) {
   // do thing
 });

// prints:
// lastName string
// birthday date
```

##### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`, `string`>
