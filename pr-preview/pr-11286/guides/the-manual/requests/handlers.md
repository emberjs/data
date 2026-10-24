---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/guides/the-manual/requests/handlers.md
description: >-
  Write a Handler middleware that calls next and normalizes a REST response into
  a JSON:API document with dasherize and singularize so the cache can consume
  it.
---

# Handlers

Handlers are middleware that enable enhancing, modifying, or responding to requests. They are best used for handling concerns shared by a large number of requests - whereas builders are better suited for customizing the details of a specific request.

Handlers are also the primary tool to use for massaging response data into a better format. For instance, the data returned by many RESTful APIs will need transformed into [{json:api}](https://jsonapi.org/) in order to take advantage of features specific to polymorphism, caching, reactivity and relational mapping.

Below, we show an example of how to write a simple handler to transform a response containing only non-relational field.

:::tabs

\== API Response

```json
{
  "user_accounts": [
    {
      "id": 1,
      "first_name": "Chris",
      "last_name": "Thoburn",
      "username": "runspired"
    }
  ],
  "_user_accounts": [
    {
      "id": 2,
      "first_name": "Krystan",
      "last_name": "HuffMenne",
      "username": "gitKrystan"
    }
  ],
}
```

\== Handler

```ts
import { dasherize, singularize } from '@warp-drive/utilities/string';

export const TransformResponse = { // [!code focus:7]
  request(context, next) {
    return next(context.request).then(({ content }) => {
      return normalizeResponse(content);
    });
  },
};

function normalizeResponse(content) {
  const result = {
    data: [],
    included: [],
  };

  for (const key of Object.keys(content)) {
    const value = content[key];
    const isPrimary = !key.startsWith('_');
    const type = dasherize(singularize(key.replace(/^_/, '')));

    for (const rawResource of value) {
      const resource = normalizeResource(type, rawResource);

      if (isPrimary) {
        result.data.push(resource);
      } else {
        result.included.push(resource);
      }
    }
  }

  return result;
}

function normalizeResource(type, rawResource) {
  const resource = {
    type,
    id: String(rawResource.id),
    attributes: {
      ...rawResource,
    },
  };

  // remove id from remaining attributes
  delete resource.attributes.id;

  return resource;
}
```

\== Handler Output

```json
{
  "data": [
    {
      "type": "user-account",
      "id": "1",
      "attributes": {
        "first_name": "Chris",
        "last_name": "Thoburn",
        "username": "runspired"
      }
    }
  ],
  "included": [
    {
      "type": "user-account",
      "id": "2",
      "attributes": {
        "first_name": "Krystan",
        "last_name": "HuffMenne",
        "username": "gitKrystan"
      }
    }
  ],
}
```

:::
