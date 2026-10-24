---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/holodeck/mock/types/Scaffold.md
description: >-
  Full description of a mocked request, its request body to match, and its
  response status, headers, and body, as sent to the Holodeck server to record a
  fixture.
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

Defined in: [mock.ts:14](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/packages/holodeck/src/mock.ts#L14)

## Properties

### body

```ts
body: 
  | string
  | Record<string, string>
  | null;
```

Defined in: [mock.ts:18](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/packages/holodeck/src/mock.ts#L18)

***

### headers

```ts
headers: Record<string, string>;
```

Defined in: [mock.ts:17](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/packages/holodeck/src/mock.ts#L17)

***

### method

```ts
method: string;
```

Defined in: [mock.ts:19](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/packages/holodeck/src/mock.ts#L19)

***

### response

```ts
response: Record<string, unknown>;
```

Defined in: [mock.ts:21](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/packages/holodeck/src/mock.ts#L21)

***

### status

```ts
status: number;
```

Defined in: [mock.ts:15](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/packages/holodeck/src/mock.ts#L15)

***

### statusText?

```ts
optional statusText?: string;
```

Defined in: [mock.ts:16](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/packages/holodeck/src/mock.ts#L16)

***

### url

```ts
url: string;
```

Defined in: [mock.ts:20](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/packages/holodeck/src/mock.ts#L20)
