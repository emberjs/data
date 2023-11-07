import type Owner from '@ember/owner';

import type Store from '@ember-data/store';
import { Value } from '@warp-drive/core-types/json/raw';
import type { SingleResourceDocument } from '@warp-drive/core-types/spec/raw';

export function simplePayloadNormalize(owner: Owner, payload: SingleResourceDocument): SingleResourceDocument {
  const store = owner.lookup('service:store') as Store;
  const attrSchema = store.schema.attributesDefinitionFor(payload.data);
  const attrs = payload.data.attributes;

  if (!attrs) {
    return payload;
  }

  Object.keys(attrs).forEach((key) => {
    const schema = attrSchema[key];

    if (schema) {
      if (schema.type) {
        const transform = owner.lookup(`transform:${schema.type}`) as {
          deserialize(v: Value): Value;
        };
        const value = attrs[key];

        attrs[key] = transform.deserialize(value);
      }
    }
  });

  return payload;
}
