# @warp-drive/core

This package provides the core [*Warp***Drive**](https://warp-drive.io) experience. Head over to the [guides](/guide)
for an introduction to *Warp***Drive**

## Installation

```sh
pnpm install -E @warp-drive/core@latest
```

See [Configuration](/guide/1-configuration/1-overview) for full installation and configuration instructions.

## Bare Bones Setup

```ts [services/store.ts]
import { RequestManager, Store, Fetch } from '@warp-drive/core';

export default class AppStore extends Store {
  requestManager = new RequestManager()
    .use([Fetch]);
}
```

## Basic Usage

```ts
const { content } = await store.request({ url: '/api/users' });
```
