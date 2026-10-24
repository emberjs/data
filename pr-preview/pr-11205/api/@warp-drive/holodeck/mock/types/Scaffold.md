---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/holodeck/mock/types/Scaffold.md
---

# &#x20;Scaffold

```ts
interface Scaffold {
  body: 
  | string
  | Record<string, string>
  | null;
  headers: Record<string, string>;
  method: string;
  response: Record<string, unknown>;
  status: number;
  statusText?: string;
  url: string;
}
```

Defined in: [mock.ts:6](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/packages/holodeck/src/mock.ts#L6)

## Properties

### body

```ts
body: 
  | string
  | Record<string, string>
  | null;
```

Defined in: [mock.ts:10](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/packages/holodeck/src/mock.ts#L10)

***

### headers

```ts
headers: Record<string, string>;
```

Defined in: [mock.ts:9](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/packages/holodeck/src/mock.ts#L9)

***

### method

```ts
method: string;
```

Defined in: [mock.ts:11](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/packages/holodeck/src/mock.ts#L11)

***

### response

```ts
response: Record<string, unknown>;
```

Defined in: [mock.ts:13](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/packages/holodeck/src/mock.ts#L13)

***

### status

```ts
status: number;
```

Defined in: [mock.ts:7](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/packages/holodeck/src/mock.ts#L7)

***

### statusText?

```ts
optional statusText?: string;
```

Defined in: [mock.ts:8](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/packages/holodeck/src/mock.ts#L8)

***

### url

```ts
url: string;
```

Defined in: [mock.ts:12](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/packages/holodeck/src/mock.ts#L12)
