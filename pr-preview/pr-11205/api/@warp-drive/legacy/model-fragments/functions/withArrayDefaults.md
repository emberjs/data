---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/legacy/model-fragments/functions/withArrayDefaults.md
---

&#x20;

# &#x20;withArrayDefaults()

```ts
function withArrayDefaults<ArrayName extends string, PrimitiveType extends string>(arrayName: ArrayName, primitiveType?: PrimitiveType): PrimitiveType extends undefined ? {
  kind: "array";
  name: ArrayName;
  options: {
     arrayExtensions: string[];
  };
  type: "array";
} : {
  kind: "array";
  name: ArrayName;
  options: {
     arrayExtensions: string[];
  };
  type: `array:${PrimitiveType}`;
};
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/utilities/with-array-defaults.ts:9](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/model-fragments/utilities/with-array-defaults.ts#L9)

Used as a helper to setup the relevant parts of an array
schema and add extensions etc.

## Type Parameters

### ArrayName

`ArrayName` *extends* `string`

### PrimitiveType

`PrimitiveType` *extends* `string`

## Parameters

### arrayName

`ArrayName`

The name of the array

### primitiveType?

`PrimitiveType`

The primitive type of items in the array (optional)

## Returns

`PrimitiveType` *extends* `undefined` ? {
`kind`: `"array"`;
`name`: `ArrayName`;
`options`: {
`arrayExtensions`: `string`\[];
};
`type`: `"array"`;
} : {
`kind`: `"array"`;
`name`: `ArrayName`;
`options`: {
`arrayExtensions`: `string`\[];
};
`type`: `` `array:${PrimitiveType}` ``;
}

The schema for an array
