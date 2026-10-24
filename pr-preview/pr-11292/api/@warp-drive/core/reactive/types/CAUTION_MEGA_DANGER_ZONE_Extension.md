---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/reactive/types/CAUTION_MEGA_DANGER_ZONE_Extension.md
---

# &#x20;CAUTION\_MEGA\_DANGER\_ZONE\_Extension

```ts
interface CAUTION_MEGA_DANGER_ZONE_Extension {
  features: 
  | Function
  | Record<string | symbol, unknown>;
  kind: "object" | "array";
  name: string;
}
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:92](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/reactive/-private/schema.ts#L92)

Extensions allow providing non-schema driven behaviors to
ReactiveResources, ReactiveArrays, and ReactiveObjects.

This should only be used for temporary migration purposes
to the new schema system when migrating from either Model
or ModelFragments.

## Properties

### features

```ts
features: 
  | Function
| Record<string | symbol, unknown>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:182](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/reactive/-private/schema.ts#L182)

An object with iterable keys whose values are the getters
or methods to expose on the object or array.

or

A constructable such as a Function or Class whose prototype
will be iterated with getOwnPropertyNames.

Examples:

**An Object with methods**

```ts
store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
   kind: 'object',
   name: 'do-thing-1',
   features: {
     doThingOne(this: { street: string }) {
       return `do-thing-1:${this.street}`;
     },
     doThingTwo(this: { street: string }) {
       return `do-thing-1:${this.street}`;
     },
   },
 });
```

**A class with getters, methods and decorated fields**

```ts
class Features {
  sayHello() {
    return 'hello!';
  }

  @tracked trackedField = 'initial tracked value';

  get realName() {
    const self = this as unknown as { name: string };
    return self.name;
  }
  set realName(v: string) {
    const self = this as unknown as { name: string };
    self.name = v;
  }

  get greeting() {
    const self = this as unknown as { name: string };
    return `hello ${self.name}!`;
  }

  @computed('name')
  get salutation() {
    const self = this as unknown as { name: string };
    return `salutations ${self.name}!`;
  }

  @cached
  get helloThere() {
    const self = this as unknown as { name: string };
    return `Well Hello There ${self.name}!`;
  }
}

// non-decorated fields dont appear on class prototypes as they are instance only
// @ts-expect-error
Features.prototype.untrackedField = 'initial untracked value';

store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
  kind: 'object',
  name: 'my-ext',
  features: Features,
});
```

***

### kind

```ts
kind: "object" | "array";
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:97](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/reactive/-private/schema.ts#L97)

Whether this extension extends the behaviors of objects
(both ReactiveObjects and ReactiveResources) or of arrays.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:103](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/reactive/-private/schema.ts#L103)

The name of the extension, to be used when specifying
either `objectExtensions` or `arrayExtensions` on the
field, ResourceSchema or ObjectSchema
