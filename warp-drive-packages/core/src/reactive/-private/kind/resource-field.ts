import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/build-config/macros';

import type { Future } from '../../../request';
import { defineSignal, entangleSignal, type Store, type StoreRequestInput } from '../../../store/-private';
import type { ResourceField } from '../../../types/schema/fields';
import type { Link, Links, SingleResourceRelationship } from '../../../types/spec/json-api-raw';
import { RecordStore } from '../../../types/symbols';
import type { KindContext } from '../default-mode';
import { getFieldCacheKeyStrict } from '../fields/get-field-key';
import type { ReactiveResource } from '../record';
import { Identifier, Parent } from '../symbols';

interface ResourceRelationship<T extends ReactiveResource = ReactiveResource> {
  lid: string;
  [Parent]: ReactiveResource;
  [RecordStore]: Store;
  name: string;

  data: T | null;
  links: Links;
  meta: Record<string, unknown>;
}

// TODO probably this should just be a Document
// but its separate until we work out the lid situation
class ResourceRelationship<T extends ReactiveResource = ReactiveResource> {
  constructor(context: KindContext<ResourceField>) {
    const { store, resourceKey } = context;
    const { cache } = store;
    const name = getFieldCacheKeyStrict(context.field);
    const rawValue = (
      context.editable ? cache.getRelationship(resourceKey, name) : cache.getRemoteRelationship(resourceKey, name)
    ) as SingleResourceRelationship;

    // TODO setup true lids for relationship documents
    // @ts-expect-error we need to give relationship documents a lid
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.lid = rawValue.lid ?? rawValue.links?.self ?? `relationship:${resourceKey.lid}.${name}`;
    this.data = rawValue.data ? (store.peekRecord(rawValue.data) as T) : null;
    this.name = name;

    if (DEBUG) {
      this.links = Object.freeze(Object.assign({}, rawValue.links));
      this.meta = Object.freeze(Object.assign({}, rawValue.meta));
    } else {
      this.links = rawValue.links ?? {};
      this.meta = rawValue.meta ?? {};
    }

    this[RecordStore] = store;
    this[Parent] = context.record;
  }

  fetch(options?: StoreRequestInput<T, T>): Future<T> {
    const url = options?.url ?? getHref(this.links.related) ?? getHref(this.links.self) ?? null;

    if (!url) {
      throw new Error(
        `Cannot ${options?.method ?? 'fetch'} ${this[Parent][Identifier].type}.${String(
          this.name
        )} because it has no related link`
      );
    }
    const request = Object.assign(
      {
        url,
        method: 'GET',
      },
      options
    );

    return this[RecordStore].request<T>(request);
  }
}

defineSignal(ResourceRelationship.prototype, 'data', null);
defineSignal(ResourceRelationship.prototype, 'links', null);
defineSignal(ResourceRelationship.prototype, 'meta', null);

function getHref(link?: Link | null): string | null {
  if (!link) {
    return null;
  }
  if (typeof link === 'string') {
    return link;
  }
  return link.href;
}

export function getResourceField(context: KindContext<ResourceField>): unknown {
  entangleSignal(context.signals, context.record, context.path.at(-1)!, null);
  return new ResourceRelationship(context);
}

export function setResourceField(context: KindContext<ResourceField>): boolean {
  assert(`setting resource relationships is not yet supported`);
  return false;
}
