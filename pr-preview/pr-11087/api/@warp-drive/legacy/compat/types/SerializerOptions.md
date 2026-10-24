---
url: /pr-preview/pr-11087/api/@warp-drive/legacy/compat/types/SerializerOptions.md
---

&#x20;

# &#x20;SerializerOptions

```ts
type SerializerOptions = {
  includeId?: boolean;
};
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-serializer-interface.ts:16](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-serializer-interface.ts#L16)

Options accepted by [serialize](MinimumSerializerInterface.md#serialize)
and related legacy serializer methods.

## Properties

### includeId?

```ts
optional includeId?: boolean;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-serializer-interface.ts:20](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-serializer-interface.ts#L20)

whether the resource's id should be included in the serialized output
