# JSON:API Graphs

## Abstract Query Language

For DX we introduce a new `.aql` syntax to make authoring JSON:API queries terse.

### At a Glance

Say we wanted to make the following query against the `/api/companies` endpoint

```json
{
  "q:search": {
    "include": "ceo",
    "fields": {
      "company": ["name", "ceo"],
      "employee": ["name", "profileImage"]
    },
    "filter": {
      "company": {
        "size": "large",
      }
    },
    "page": {
      "size": 10
    }
  }
}
```

To define this query we create a `.aql` file

```aql
# /companies-query.aql
# This is a Comment
QUERY company { # we wrap our query definition in QUERY {} and specify the primary resource type
  data { # the graph of data we want back goes in data
    name
    ceo { # relationships with {} after them will be included
      name
      # if ceo is an employee and something else
      # also declares fields for an employee, the
      # field sets will be merged
      profileImage 
    }
  }
  filter {
    # @arg is used to declare variables
    # the argument type is infered from the initializer value
    # if there is one, but may be overriden by supplying
    # a valid arg type list in parens
    @arg(null,string) size = "large"
  }
  # statements may be ended by a `;`, `#`, `}` or newline
  page { @arg size = 10 }
}
```

Without comments for terseness

```aql
QUERY company {
  data {
    name
    ceo { name; profileImage  }
  }
  filter {
    @arg(null,string) size = "large"
  }
  page { @arg size = 10 }
}
```
