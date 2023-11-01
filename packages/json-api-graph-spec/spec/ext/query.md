# JSON:API Graphs

## QUERY Extension

This is the specification of [an extension](https://jsonapi.org/format/1.2/#extension-rules) for the JSON:API specification.

### URI

The URI for this profile is [https://github.com/emberjs/data/tree/main/packages/json-api-graph-spec/spec/ext/query.md](https://github.com/emberjs/data/tree/main/packages/json-api-graph-spec/spec/ext/query.md)

### Namespace

This extension uses the namespace `q`.

## Fetching Resources

This specification defines a mechanism for client-built and pre-built query execution. In both cases, requests are issued against the same URL as if a
GET request had been made under the rules of the base specification.

For instance, consider the following request:

```http
GET /api/companies?fields[company]=name&fields[employee]=name,profileImage&included=ceo&page[size]=10 HTTP/2
Accept: application/vnd.api+json
```

When implementing this specification, had the above been a valid query, then the following queries MUST also be valid.

```http
QUERY /api/companies
Accept: application/vnd.api+json

{
  "q:search": {
    include: "ceo",
    fields: {
      company: "name",
      employee: ["name", "profileImage"]
    },
    page: {
      size: 10
    }
  }
}
```

```http
GET /api/companies?q:id=1dfd6f1324e37e76ce612556a1f0cb8f80b4eab269592ab53cf00e64f259ce30&q:args[size]=10
Accept: application/vnd.api+json
```

> **note**
> The GET version of this pre-supposes the server's use of the [parser spec](../spec-query-parser.md)
> to enable the use of variables

It is also allowable for some parts of the query to be in the url, though when this occurs there MUST be no
key conflicts between the two.

```http
QUERY /api/companies?page[size]=10
Accept: application/vnd.api+json

{
  "q:search": {
    include: "ceo",
    fields: {
      company: "name",
      employee: ["name", "profileImage"]
    }
  }
}
```

```http
GET /api/companies?q:id=1dfd6f1324e37e76ce612556a1f0cb8f80b4eab269592ab53cf00e64f259ce30&page[size]=10
Accept: application/vnd.api+json
```

### Query Parameters

This specification defines two query parameters within its `q:` namespace

 - `q:id` specifies the ID of a query the server should already be familiar with
 - `q:args[<argName>]` is a parameter group allowing the passing of argument values to apply to the query specified by `q:id`.

### Client Built Queries

Where support is available, the http `QUERY` verb is to be used.

A fallback is available by using the http `POST` verb with the the `X-HTTP-Method-Override` header set to `QUERY`

> **warning**
> It is expected that all implementations support the fallback given the recent and tentative nature of the QUERY
> RFC to the HTTP Specification.

### Persisted Queries

A server may allow accesss to persisted queries whose IDs shall be the sha-256 hash of the query.

If a persisted query exists, the server should support its utilization by *either* `QUERY` or `GET`.

In the case of `QUERY`, variables for use with the query will be defined in the `body`.

```http
QUERY /api/companies?q:id=1dfd6f1324e37e76ce612556a1f0cb8f80b4eab269592ab53cf00e64f259ce30
Accept: application/vnd.api+json

{
  "q:args": {
    size: 10
  }
}
```

In the case of `GET`, variables for use with the query will be defined in URLSearchParams using the `q:args` parameter group. Thus a variable named `size` would be `q:args[size]` and a variable named `$limit` would be `q:args[$limit]`.

### Variables

Variables are *only* available for persisted queries and their values MUST be limited to the primitive types `string`, `number`, `boolean` or `null`. 

In `JSON` form, a persisted query can indicate the use of a variable by
prefixing the key with `$` and supplying the primitive type or types it
is allowed to parse to.

```json
{
  "include": "ceo",
  "fields": {
    "company": "name",
    "employee": ["name", "profileImage"]
  },
  "page": {
    "$size": "number,null"
  }
}
```

Note, the `$` is not considered part of the key once variables are applied. So given the value of `10` for size the query with variables applied would be:

```json
{
  "include": "ceo",
  "fields": {
    "company": "name",
    "employee": ["name", "profileImage"]
  },
  "page": {
    "size": 10
  }
}
```

If `$` is otherwise in use, and not a variable, it should be escaped.

```json
{
  "fields": {
    "\$company": "name",
  },
}
```

> **note**
> This specification reserves `$` for infrastructure use on all member names.
> Thus implementation usage of `$keys` outside of this spec is disallowed.

### Variable Name Conflicts

If two variable names conflict, an error should be thrown if the server can not disambiguate when
running the query.

Name conflicts should be resolved by either renaming the variable or by using the variable path.

For instance, imagine a query that lets us specify both page size and filter by company size

```json
{
  "include": "ceo",
  "fields": {
    "company": "name",
    "employee": ["name", "profileImage"]
  },
  "filter": {
    "company": {
      "$size": "number,null",
    }
  },
  "page": {
    "$size": "number,null"
  }
}
```

In this case `q:args[size]=10` is not enough to disambiguate *which* `size` variable we
are looking to fulfill. We disambiguate by providing the full path.

```http
GET /api/companies?q:id=1dfd6f1324e37e76ce612556a1f0cb8f80b4eab269592ab53cf00e64f259ce30&q:args[filter.company.size]=1000&q:args[page.size]=10
Accept: application/vnd.api+json
```

And for `QUERY`

```http
QUERY /api/companies?q:id=1dfd6f1324e37e76ce612556a1f0cb8f80b4eab269592ab53cf00e64f259ce30
Accept: application/vnd.api+json

{
  "q:args": {
    filter: { company: { size: 1000 } },
    page: { size: 10 }
  }
}
```

Note that variables are allowed to be fulfilled by their regular query param definitions as well, so this conflict
could also be solved with the following approach:

```http
GET /api/companies?q:id=1dfd6f1324e37e76ce612556a1f0cb8f80b4eab269592ab53cf00e64f259ce30&filter[company.size]=1000&page[size]=10
Accept: application/vnd.api+json
```

And for `QUERY`

```http
QUERY /api/companies?q:id=1dfd6f1324e37e76ce612556a1f0cb8f80b4eab269592ab53cf00e64f259ce30
Accept: application/vnd.api+json

{
  "q:args": {
    filter: { company: { size: 1000 } },
    page: { size: 10 }
  }
}
```

For non `JSON` syntax see the [parser spec](../aql.md).

## Filter Queries

The base [JSON:API spec](https://jsonapi.org/format/#fetching-filtering) leaves [filtering up to individual implementations](https://jsonapi.org/recommendations/#filtering). This leads to [confusion](https://discuss.jsonapi.org/t/filtering-querying-deep-relationships-a-proposal-for-a-syntax/1746) around
when a filter should apply to the overall result set or to a related collection nested within.

This spec adopts a format which disambiguates the meaning.

### Filtering the Primary Result Set

Lets say we want a list of authors that have written at least 10 articles.

```http
GET /api/authors?filter[articles.length]=
```

### Filtering Related Collections
