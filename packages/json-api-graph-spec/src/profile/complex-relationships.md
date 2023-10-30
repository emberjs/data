# JSON:API Graphs

## Complex Relationships

This is the specification of [a profile](https://jsonapi.org/format/1.2/#profile-rules) for the JSON:API specification.

The URI for this profile is [https://github.com/emberjs/data/tree/main/packages/json-api-graph-spec/src/profile/complex-relationships.md](https://github.com/emberjs/data/tree/main/packages/json-api-graph-spec/src/profile/complex-relationships.md)

This profile adds support for [linkage](https://jsonapi.org/format/#document-resource-identifier-objects) via `*` members as well as for
deeply nested relationships via `rel:` members.

It makes the following payload valid: 

```json
{
  "data": {
    "type": "user",
    "id": "1",
    "attributes": {
      "name": "Chris",
      "*partner": { "type": "user", "id": "2" }
      "address": {
        "*city": { "type": "location", "id": "1" },
        "rel:visitors": {
          "links": {
            "self": "/api/v1/users/1/address/visitors",
            "related": "/api/v1/users/1/address/visitors?page[limit]=5",
            "first": "/api/v1/users/1/address/visitors?page[limit]=5",
            "prev": null,
            "next": "/api/v1/users/1/address/visitors?page[limit]=5&page[after]=7",
            "last": "/api/v1/users/1/address/visitors?page[limit]=5&page[after]=417"
          },
          "meta": {
            "page": {
              "limit": 5,
              "maxLimit": 50,
              "total": 420
            }
          },
          "data": [
            { "type": "user", "id": "3" },
            { "type": "user", "id": "4" },
            { "type": "user", "id": "5" },
            { "type": "user", "id": "6" },
            { "type": "user", "id": "7" }
          ]
        }
      },
    }
  },
  "included": [
    {
      "type": "location",
      "id": "1",
      "attributes": {
        "name": "Oakland",
      }
    },
    {
      "type": "user",
      "id": "2",
      "attributes": {
        "name": "Wesley",
        "*partner": { "type": "user", "id": "1" }
        "address": {
          "*city": { "type": "location", "id": "1" }
        }
      }
    },
    { "type": "user", "id": "3", "attributes": { "name": "William" } },
    { "type": "user", "id": "4", "attributes": { "name": "Allison" } },
    { "type": "user", "id": "5", "attributes": { "name": "Hannah" } },
    { "type": "user", "id": "6", "attributes": { "name": "John" } },
    { "type": "user", "id": "7", "attributes": { "name": "Renée" } },
  ]
}
```

## Specification

### Terminology

We refer to a `*` prefixed member as a `*member` "star member" (plural `*members`) "star members" and to the combination of the member name and value as a `field`.

We refer to a `rel:` prefixed member as a `rel:member` "rel member" (plural `rel:members`) "rel members" and to the combination of the member name and value as a `field`.

### Linkage

`*members` MUST have a value that is either null, a linkage, or an array of linkages and values.

The empty values of `*members` are semantically meaningful. `null` means that
the value would otherwise be a single resource identifier. An empty array `[]`
means that the value would be a list of identifiers or [identifiers and values](#mixed-linkage).

Linkage is here defined as an object with the following signature:

```ts
type ExistingResourceIdentifierObject = {
  type: string;
  id: string;
  lid?: string;
}
```

For such cases as when a client is saving a newly created resource, or a server is delivering a notification about a resource remotely created but not yet persisted (for instance in a collaborative realtime scenario), the following signature is valid:

```ts
type NewResourceIdentifierObject = {
  type: string;
  id: null;
  lid: string;
}
```

Generally an API will supply only linkages matching the `ExistingResourceIdentifierObject` interface while a client
might supply one matching `NewResourceIdentifierObject` when creating a new entity

However, we intentionally allow for APIs to also supply the `NewResourceIdentifierObject` interface with the
**exlicit semantics** that it means the resource is not persisted and eventual persistance is not guaranteed.

This is useful for a number of situations in which APIs cache temporary client state for resumability, restoration or
real-time scenarios.

### Mixed Linkage

When a `*member` has an array value, the array may contain non-linkage values so long as
at least one value is a linkage.

Any value that is an object that with linkage members will be treated as such. If additional
members are present alongside linkage members, an error MUST be raised to avoid ambiguity.

Any serializable value, including primitive values, are valid as non-linkage values.

If all values are non-linkage values, the member should not be prefixed with a `*`.

### `rel:member` Values

The value of a `rel:member` MUST be a [relationship object](https://jsonapi.org/format/#document-resource-object-relationships).

If the relationship object has a `data` member, all resources in it MUST be present in the payload
(e.g. the rule of full linkage applies to `rel:member` relationships the same as to conventional relationships).

### Inclusion

When a server returns a request for data which contains resources linked by `*members` it MUST adhere to several rules.

1. All resources referenced by `*members` must be present in the payload.
2. Any lists of resources referenced by `*members` are "complete" (unpaginated and represent the totality of information known by the API for that member)

### Member Names

- **Uniqueness**:
  - Clients and APIs should consider the non-star and 
`*` variants of members as being identical, and thus no payload
should ever contain both.
  - Clients and APIs should consider the `rel:` and non-`rel:` variants of members as being identical, and thus no payload should ever contain both within the same object.

E.g. `*bestFriend` and `bestFriend` refer to the same member and should not both appear in members.

- **Semantics**:
  - When the `*` is not present, the value should not be considered a reference even when it otherwise has occurred as such.
  - When `rel:` is not present, the value should not be considerd a relationship even when it otherwise has occurred as such.

In other words, even if a client knows additional schema information beyond what is heuristically derivable from the payload, it must interpret that value in the payload respectively as a non-reference
and non-relationship.

This **explicitly** allows the same field to sometimes be a reference or relationship and to sometimes be an embedded value.

- **Valid Locations**: 
  - `*members` may only occur within `attributes`.
  - `rel:members` may only occur within values within `attributes` but never as a member of `attributes`
