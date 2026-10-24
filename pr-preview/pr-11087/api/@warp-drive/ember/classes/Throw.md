---
url: /pr-preview/pr-11087/api/@warp-drive/ember/classes/Throw.md
---

# &#x20;Throw\<T>

Defined in: [warp-drive-packages/ember/dist/index.d.ts:325](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/ember/dist/index.d.ts#L325)

The `<Throw />` component is used to throw an error in a template.

That's all it does. So don't use it unless the application should
throw an error if it reaches this point in the template.

```gts
<Throw @error={{anError}} />
```

## Extends

* `default`<`ThrowSignature`<`T`>>

## Type Parameters

### T

`T`

## Constructors

### Constructor

```ts
new Throw<T>(owner: Owner, args: {
  error: T;
}): Throw<T>;
```

Defined in: [warp-drive-packages/ember/dist/index.d.ts:326](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/ember/dist/index.d.ts#L326)

#### Parameters

##### owner

`Owner`

##### args

###### error

`T`

#### Returns

`Throw`<`T`>

#### Overrides

```ts
Component<ThrowSignature<T>>.constructor
```
