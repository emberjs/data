# Requirements

## Definitely

- Fragments and FragmentArrays have the same per-instance API surface

"MF Array" is a ManagedArray with ??? extensions
"MF FragmentArray" is a ReactiveRecordArray with the "ember-array-like" "ember-object" and "fragment-array" extensions
"Fragment" is a SchemaObject with the "ember-object" and "fragment" extensions
"fragments" are defined as "ObjectSchemas" and references via a "schema-object" field kind

```ts [before]
// app/models/person.js
import Model from "@ember-data/model";
import {
  fragment,
  fragmentArray,
  array,
} from "ember-data-model-fragments/attributes";

export default class PersonModel extends Model {
  @fragment("name") name;
  @fragmentArray("address") addresses;
  @array() titles;
}

// app/models/name.js

import Fragment from "ember-data-model-fragments/fragment";
import { attr } from "@ember-data/model";

export default class NameFragment extends Fragment {
  @attr("string") first;
  @attr("string") last;
}

// app/models/address.js

import Fragment from "ember-data-model-fragments/fragment";
import { attr } from "@ember-data/model";

export default class AddressFragment extends Fragment {
  @attr("string") street;
  @attr("string") city;
  @attr("string") region;
  @attr("string") country;
}
```

```ts [after]
import { withDefaults as withLegacy } from '@warp-drive/legacy/model/migration-support';
const PersonSchema = withLegacy({
  type: 'person',
  identity: { kind: '@identity', name: 'id' },
  fields: [
    {
      kind: 'schema-object',
      type: 'fragment:name',
      name: 'name',
      options: {
        objectExtensions: ['ember-object', 'model-fragments']
      }
    },
    {
      kind: 'schema-array',
      type: 'fragment:address',
      name: 'addresses',
      options: {
        arrayExtensions: ['ember-object', 'ember-array-like', 'fragment-array']
      },
    },
    {
      kind: 'array',
      name: 'titles',
      options: {
        arrayExtensions: ['ember-object', 'ember-array-like', 'fragment-array']
      }
    }
  ],
  objectExtensions: ['ember-object', 'model-fragments']
})

const NameSchema = {
  type: 'fragment:name',
  identity: null,
  fields: [
    { kind: 'field', name: 'first' },
    { kind: 'field', name: 'last' },
  ],
  objectExtensions: ['ember-object', 'model-fragments']
};

const AddressSchema = {
  type: 'fragment:address',
  identity: null,
  fields: [
    { kind: 'field', name: 'street' },
    { kind: 'field', name: 'city' },
    { kind: 'field', name: 'region' },
    { kind: 'field', name: 'country' },
  ]
};

```

- We can serialize/deserialize fragments to data
- Record instances need MF extension methods/props


- We support custom computeds and methods provided by the end user on Model
- We support custom computeds and methods provided by the end user on a Fragment

This is supported by regstering an extension specific to the model or the fragment

## Maybe
- Store needs method extensions
- we can create stand alone fragments
- we can define fragments and fragments arrays on Models via decorator