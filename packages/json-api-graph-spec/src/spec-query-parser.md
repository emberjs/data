# JSON:API Graphs

## QUERY Parse Spec

Say we wanted to make the following query:

```json
{
  "query:search": {
    "include": "ceo",
    "fields": {
      "company": "name",
      "employee": ["name", "profileImage"]
    },
    "page": {
      "size": 10
    }
  }
}
```

```gql
query {
  company {
    
  }
}
```

### Variables
