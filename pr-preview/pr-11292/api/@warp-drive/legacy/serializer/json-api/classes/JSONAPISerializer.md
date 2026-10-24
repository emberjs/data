---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/serializer/json-api/classes/JSONAPISerializer.md
---

&#x20;

# &#x20;JSONAPISerializer&#x20;

Defined in: [warp-drive-packages/legacy/src/serializer/json-api.ts:142](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/serializer/json-api.ts#L142)

:::danger
⚠️ This is LEGACY documentation for a feature that is no longer encouraged to be used.
If starting a new app or thinking of implementing a new adapter, consider writing a
Handler instead to be used with the [RequestManager](../../../../core/classes/RequestManager.md)
:::

In WarpDrive a Serializer is used to serialize and deserialize
records when they are transferred in and out of an external source.
This process involves normalizing property names, transforming
attribute values and serializing relationships.

`JSONAPISerializer` supports the http://jsonapi.org/ spec, though
even compliant {json:api} servers may find writing an application
specific serializer better suited to their needs and more performant.

This serializer normalizes a JSON API payload that looks like:

```js [app/models/player.js]
import Model, { attr, belongsTo } from '@warp-drive/legacy/model';

export default class Player extends Model {
  @attr('string') name;
  @attr('string') skill;
  @attr('number') gamesPlayed;
  @belongsTo('club') club;
}
```

```js [app/models/club.js]
import Model, { attr, hasMany } from '@warp-drive/legacy/model';

export default class Club extends Model {
  @attr('string') name;
  @attr('string') location;
  @hasMany('player') players;
}
```

```js
  {
    "data": [
      {
        "attributes": {
          "name": "Benfica",
          "location": "Portugal"
        },
        "id": "1",
        "relationships": {
          "players": {
            "data": [
              {
                "id": "3",
                "type": "players"
              }
            ]
          }
        },
        "type": "clubs"
      }
    ],
    "included": [
      {
        "attributes": {
          "name": "Eusebio Silva Ferreira",
          "skill": "Rocket shot",
          "games-played": 431
        },
        "id": "3",
        "relationships": {
          "club": {
            "data": {
              "id": "1",
              "type": "clubs"
            }
          }
        },
        "type": "players"
      }
    ]
  }
```

to the format that the JSONAPICache expects.

### Customizing meta

Since a JSON API Document can have meta defined in multiple locations you can
use the specific serializer hooks if you need to customize the meta.

One scenario would be to camelCase the meta keys of your payload. The example
below shows how this could be done using `normalizeArrayResponse` and
`extractRelationship`.

```js [app/serializers/application.js]
import { JSONAPISerializer } from '@warp-drive/legacy/serializer/json-api';

export default class ApplicationSerializer extends JSONAPISerializer {
  normalizeArrayResponse(store, primaryModelClass, payload, id, requestType) {
    let normalizedDocument = super.normalizeArrayResponse(...arguments);

    // Customize document meta
    normalizedDocument.meta = camelCaseKeys(normalizedDocument.meta);

    return normalizedDocument;
  }

  extractRelationship(relationshipHash) {
    let normalizedRelationship = super.extractRelationship(...arguments);

    // Customize relationship meta
    normalizedRelationship.meta = camelCaseKeys(normalizedRelationship.meta);

    return normalizedRelationship;
  }
}
```
