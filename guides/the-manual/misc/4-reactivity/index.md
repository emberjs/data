# Reactive Data

In addition to request and cache management, WarpDrive provides a reactive access
layer for data in the cache.

Data in the cache is conceptualized as belonging to one of three forms

- **Documents** - the response to a request
- **Resources** - a unique cacheable entity within the response to a request
- **Fields** - the data for an individual property on a resource

Each form of data can be accessed and managed reactively through one of two modes

- *(upcoming, default in v6)* [PolarisMode](./polaris/overview.md)
- *(current, default in v5)* [LegacyMode](./legacy/overview.md)

These modes are interopable. The reactive object (record) for a resource in PolarisMode can relate to
a record in LegacyMode and vice-versa. This interopability is true whether the record in LegacyMode is
a ReactiveResource or a Model.

These reactive primitives use fine-grained signals-based reactivity. The specific implementation used is pluggable and can be integrated with any implementation or
even multiple at once.

For Ember, we use glimmer's implementation of `Signal` (`@tracked`) and `Computed` (`@cached`), though the integration does not have to be an implementation of signals
at all! For instance, `react` could be integrated by utilizing [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) in place of signals and subscribing to all potential changes via the notification manager. 
