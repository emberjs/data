import type Model from '@ember-data/model';
import { cached, tracked } from '@glimmer/tracking';
import type { CAUTION_MEGA_DANGER_ZONE_Extension } from '@warp-drive/core/reactive';
import type { ManagedArray } from '@warp-drive/core/reactive/-private/fields/managed-array';
import { Context } from '@warp-drive/schema-record/-private';

import type { WithFragmentArray } from '../index.js';
import { Fragment } from './fragment.js';

export class FragmentArray<T extends Fragment> {
  // We might want to check the parent values once we move this code to warp-drive.
  @tracked isDestroying = false;
  @tracked isDestroyed = false;

  @cached
  get hasDirtyAttributes() {
    const { path, resourceKey, store } = (this as unknown as ManagedArray)[
      Context
    ];
    const record = store.peekRecord(resourceKey) as Model;

    if (record.hasDirtyAttributes && path) {
      const root = path.at(0) as string;
      return root in record.changedAttributes();
    }

    return false;
  }

  addFragment(fragment?: T) {
    if (!fragment) {
      return;
    }

    return (this as unknown as WithFragmentArray<T>).addObject(fragment);
  }

  createFragment(fragment?: T) {
    if (!fragment) {
      return;
    }

    return (this as unknown as WithFragmentArray<T>).pushObject(fragment);
  }

  removeFragment(fragment?: T) {
    if (!fragment) {
      return;
    }

    const index = (this as unknown as WithFragmentArray<T>).indexOf(fragment);

    if (index !== -1) {
      (this as unknown as WithFragmentArray<T>).splice(index, 1);
    }
  }

  rollbackAttributes() {
    for (const fragment of this as unknown as WithFragmentArray<T>) {
      // @ts-expect-error TODO: fix these types
      fragment?.rollbackAttributes?.();
    }
  }
}

export const FragmentArrayExtension = {
  kind: 'array' as const,
  name: 'fragment-array' as const,
  features: FragmentArray,
} satisfies CAUTION_MEGA_DANGER_ZONE_Extension;

export default FragmentArrayExtension;
