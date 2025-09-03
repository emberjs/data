# @warp-drive/legacy

:::warning ⚠️ **CAUTION**
This package provides support for older *Warp***Drive** features that have been
deprecated and removed from [@warp-drive/core](/api/@warp-drive/core).

**Projects using these features should refactor away from them with urgency**
:::

You've probably heard old code patterns referred to as "legacy code" before. In *Warp***Drive**, Legacy refers to older features to which we are giving a second, extended life. When features are deprecated in [@warp-drive/core](/api/@warp-drive/core), they are added to `@warp-drive/legacy` in a way that allows apps to opt-in to bring them back.

Legacy features will not live forever, but they will receive a second deprecation
cycle before being deleted. Notably, **the decision to deprecate a legacy feature 
does not require an RFC**.

This low-barrier to removal is because the motivations for deprecating and removing the feature were already enumerated in the original deprecation that removed the feature from core. Generally if code in legacy is being deprecated, it means an event has occurred that requires full removal of support for the feature in order for the project as a whole to continue to advance.

There is no set schedule to when code in legacy might be deprecated. Sometimes it
may become deprecated immediately after the feature is removed from core, other 
times it may last for several majors. Occasionally a deprecation in core won't be 
able to be restored from legacy at all.

Our policy is to always attempt to provide restoration of a deprecated feature via
@warp-drive/legacy, but the decision to provide this long-tail support ultimately depends on how easy a feature is to maintain weighed against the costs to the community and project of keeping it around.


