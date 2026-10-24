---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/experiments/pagination/types/PagedPaginationContentFeatures.md
---

&#x20;

# &#x20;PagedPaginationContentFeatures\<RT>

```ts
interface PagedPaginationContentFeatures<RT> extends SharedPaginationContentFeatures<RT> {
  abort?: () => void;
  isHidden: boolean;
  isNavigating: boolean;
  isOnline: boolean;
  isRefreshing: boolean;
  latestRequest?: Future<RT>;
  loadPage: (url: string) => Promise<RT | null>;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
}
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:778](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L778)

The content features yielded in `'paged'` mode: navigation happens by
loading a specific page.

## Extends

* [`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md)<`RT`>

## Type Parameters

### RT

`RT`

## Properties

### abort?

```ts
optional abort?: () => void;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:771](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L771)

#### Returns

`void`

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`abort`](SharedPaginationContentFeatures.md#abort)

***

### isHidden

```ts
isHidden: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:759](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L759)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`isHidden`](SharedPaginationContentFeatures.md#ishidden)

***

### isNavigating

```ts
isNavigating: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:768](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L768)

Whether a changed `@request` arg is currently resolving against the
loaded collection — e.g. a route-driven navigation (browser back button).
The existing content stays rendered while this is `true`; once the
request resolves it either becomes the active page (same collection) or
the component resets to the new collection.

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`isNavigating`](SharedPaginationContentFeatures.md#isnavigating)

***

### isOnline

```ts
isOnline: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:758](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L758)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`isOnline`](SharedPaginationContentFeatures.md#isonline)

***

### isRefreshing

```ts
isRefreshing: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:760](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L760)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`isRefreshing`](SharedPaginationContentFeatures.md#isrefreshing)

***

### latestRequest?

```ts
optional latestRequest?: Future<RT>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:772](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L772)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`latestRequest`](SharedPaginationContentFeatures.md#latestrequest)

***

### loadPage

```ts
loadPage: (url: string) => Promise<RT | null>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:779](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L779)

#### Parameters

##### url

`string`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

***

### refresh

```ts
refresh: () => Promise<void>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:769](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L769)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`refresh`](SharedPaginationContentFeatures.md#refresh)

***

### reload

```ts
reload: () => Promise<void>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:770](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L770)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`reload`](SharedPaginationContentFeatures.md#reload)
