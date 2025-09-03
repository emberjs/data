# Typing Includes

Many APIs offer the concept of "sideloading" or "including related resources". For instance,
when loading a `user` you might also want to load the information for the company where they
work, the company's CEO, and a list of the user's friends. Historically this was managed
through the `includes` param.

For instance, in the example above, the includes array would usually look like this:

```ts
{ include: ['company', 'company.ceo', 'friends'] }
```

Though some users author this requirement as a string instead:

```ts
{ include: 'company,company.ceo,friends' }
```

> [!TIP]
> We recommend authoring includes as an array instead of as a string. It will
> generally scale better if the list is long, and provides better autocomplete support.
> Within WarpDrive provided builders and adapters there should be no functional
> difference between using an array or using a string.

Typing relationship paths like includes is valuable for increased confidence, as small typos in these
strings could result in significant application bugs. And, where possible, autocomplete support while
typing these strings can help a developer better learn and explore the graph of data available to be loaded.

WarpDrive offers several type utilities to assist with strictly typing strings that represent relationship
paths: `Includes` and `StringSatisfiesIncludes`


## The `Includes` Type Util

The `Includes` type util will return a union of all valid relationship paths discoverable from the input type, within a few constraints.

- Cyclical paths are eliminated, so if a user has friends that are users you should never see `user.friends.friends` or `user.friends.company` as options.
- There is a configurable MAX_DEPTH which defaults to `3` to help encourage reduced complexity and better typescript performance
- There is an absolute MAX-DEPTH for paths of `5`. If you wish to support longer paths than `5` please reach out to discuss. This limit is in place for performance reasons due to the size of union that gets generated.
- If your type/model has non-relationship properties that compute to typed record instances (or arrays of typed record instances) you may encounter false positives for paths.

> [!TIP]
> In general, we discourage the usage of `getters` (aka `computed` or `derived` fields) that compute their value from related records.


```ts
Includes<
  T extends TypedRecordInstance,
  MAX_DEPTH extends _DEPTHCOUNT = DEFAULT_MAX_DEPTH
>
```

### Basic Usage

```ts
import type { Includes } from '@warp-drive/core-types/record';

function builderThatAcceptsIncludes<T extends TypedRecordInstance>(req: {
  includes: Includes<T>[]
  // ... other props
});

builderThatAcceptsIncludes<User>({
  includes: ['friends']
})
```

## The `StringSatisfiesIncludes` Type Util

Due to limitations in TypeScript and the underlying (poor) algorithmic 
performance that would result from many approaches, comma-separated-string based
include arguments (e.g. `'company,company.ceo,friends'`) aren't typed by-default.

However, if you wish to support validating these strings with types, we offer a
stand-alone utility with reasonably good performance characteristics and minimal
runtime overhead.

We mention runtime overhead as it requires creating a function to have it work
with reasonable DX.

This approach has two main drawbacks: it currently does not autocomplete (though
we believe there's a path to making it do so) and its up to the developer to use
the validator at the callsite, its not automatic.

### Using the Runtime Function

```ts
import { createIncludeValidator } from '@warp-drive/core-types/record';

const userIncludesValidator = createIncludeValidator<User>;

function builderThatAcceptsIncludes<T extends TypedRecordInstance>(req: {
  includes: string
  // ... other props
});

builderThatAcceptsIncludes<User>({
  includes: userIncludesValidator('company,company.ceo,friends')
})
```

### Using the Type Util Directly

The type util that powers `createIncludeValidator` can be used directly; however, we only
recommend doing so if writing a wrapper utility similar to `createIncludeValidator` as
otherwise it results in needing to type out the string twice.

```ts
import type { StringSatisfiesIncludes, Includes } from '@warp-drive/core-types/record';

function builderThatAcceptsIncludes<T extends TypedRecordInstance>(req: {
  includes: string
  // ... other props
});

const includes: StringSatisfiedIncludes<
  'company,company.ceo,friends',
  Includes<User>
> = 'company,company.ceo,friends';

builderThatAcceptsIncludes<User>({
  includes
})
```
