---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/build-config/deprecations/variables/DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE.md
---

# &#x20;DEPRECATE\_RELATIONSHIP\_REMOTE\_UPDATE\_CLEARING\_LOCAL\_STATE&#x20;

```ts
const DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/deprecations.d.ts:385](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/deprecations.d.ts#L385)

Deprecates when a relationship is updated remotely and the local state
is cleared of all changes except for "new" records.

Instead, any records not present in the new payload will be considered
"removed" while any records present in the new payload will be considered "added".

This allows us to "commit" local additions and removals, preserving any additions
or removals that are not yet reflected in the remote state.

For instance, given the following initial state:

remote: A, B, C
local: add D, E
remove B, C
\=> A, D, E

If after an update, the remote state is now A, B, D, F then the new state will be

remote: A, B, D, F
local: add E
remove B
\=> A, D, E, F

Under the old behavior the updated local state would instead have been
\=> A, B, D, F

Similarly, if a belongsTo remote State was A while its local state was B,
then under the old behavior if the remote state changed to C, the local state
would be updated to C. Under the new behavior, the local state would remain B.

If the remote state was A while its local state was `null`, then under the old
behavior if the remote state changed to C, the local state would be updated to C.
Under the new behavior, the local state would remain `null`.

Thus the new correct mental model is that the state of the relationship at any point
in time is whatever the most recent remote state is, plus any local additions or removals
you have made that have not yet been reflected by the remote state.

> Note: The old behavior extended to modifying the inverse of a relationship. So if
> you had local state not reflected in the new remote state, inverses would be notified
> and their state reverted as well when "resetting" the relationship.
> Under the new behavior, since the local state is preserved the inverses will also
> not be reverted.

### Resolving this deprecation

Resolving this deprecation can be done individually for each relationship
or globally for all relationships.

To resolve it globally, set the `DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE`
to `false` in ember-cli-build.js

```js
const { setConfig } = await import('@warp-drive/build-config');

let app = new EmberApp(defaults, {});

setConfig(app, __dirname, {
  deprecations: {
    // set to false to strip the deprecated code (thereby opting into the new behavior)
    DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE: false
  }
});
```

To resolve this deprecation on an individual relationship, adjust the `options` passed to
the relationship. For relationships with inverses, both sides MUST be migrated to the new
behavior at the same time.

```js
class Person extends Model {
 @hasMany('person', {
   async: false,
   inverse: null,
   resetOnRemoteUpdate: false
 }) children;

 @belongsTo('person', {
   async: false,
   inverse: null,
   resetOnRemoteUpdate: false
 }) parent;
}
```

> Note: false is the only valid value here, all other values (including missing)
> will be treated as true, where `true` is the legacy behavior that is now deprecated.

Once you have migrated all relationships, you can remove the the resetOnRemoteUpdate
option and set the deprecation flag to false in ember-cli-build.

### What if I don't want the new behavior?

WarpDrive's philosophy is to not make assumptions about your application. Where possible
we seek out "100%" solutions – solutions that work for all use cases - and where that is
not possible we default to "90%" solutions – solutions that work for the vast majority of use
cases. In the case of "90%" solutions we look for primitives that allow you to resolve the
10% case in your application. If no such primitives exist, we provide an escape hatch that
ensures you can build the behavior you need without adopting the cost of the default solution.

In this case, the old behavior was a "40%" solution. The inability for an application developer
to determine what changes were made locally, and thus what changes should be preserved, made
it impossible to build certain features easily, or in some cases at all. The proliferation of
feature requests, bug reports (from folks surprised by the prior behavior) and addon attempts
in this space are all evidence of this.

We believe the new behavior is a "90%" solution. It works for the vast majority of use cases,
often without noticeable changes to existing application behavior, and provides primitives that
allow you to build the behavior you need for the remaining 10%.

The great news is that this behavior defaults to trusting your API similar to the old behavior.
If your API is correct, you will not need to make any changes to your application to adopt
the new behavior.

This means the 10% cases are those where you can't trust your API to provide the correct
information. In these cases, because you now have cheap access to a diff of the relationship
state, there are a few options that weren't available before:

* you can adjust returned API payloads to contain the expected changes that it doesn't include
* you can modify local state by adding or removing records on the HasMany record array to remove
  any local changes that were not returned by the API.
* you can use `<Cache>.mutate(mutation)` to directly modify the local cache state of the relationship
  to match the expected state.

What this version (5.3) does not yet provide is a way to directly modify the cache's remote state
for the relationship via public APIs other than via the broader action of upserting a response via
`<Cache>.put(document)`. However, such an API was sketched in the Cache 2.1 RFC
`<Cache>.patch(operation)` and is likely to be added in a future 5.x release of WarpDrive.

This version (5.3) also does not yet provide a way to directly modify the graph (a general purpose
subset of cache behaviors specific to relationships) via public APIs. However, during the
5.x release series we will be working on finalizing the Graph API and making it public.

If none of these options work for you, you can always opt-out more broadly by implementing
a custom Cache with the relationship behaviors you need.

## Until

6.0
