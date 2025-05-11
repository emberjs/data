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
a SchemaRecord or a Model.

These reactive primitives use fine-grained signals-based reactivity. Currently, we use
glimmer's (Ember's) implementation of `Signal` (`@tracked`) and `Computed` (`@cached`);
however, we've architected our use to be pluggable and will soon enable configuration
of any desired implementation, thus making WarpDrive compatible with any signals compatible
library or framework.
