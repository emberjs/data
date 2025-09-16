import { cached, tracked } from '@glimmer/tracking';

import type { CAUTION_MEGA_DANGER_ZONE_Extension } from '@warp-drive/core/reactive';
import type { PrivateReactiveResource } from '@warp-drive/core/reactive/-private';
import { Context } from '@warp-drive/core/reactive/-private';
import type { Value } from '@warp-drive/core/types/json/raw';

import type Model from '../../model.ts';

export class Fragment {
  // We might want to check the parent values once we move this code to warp-drive.
  @tracked isDestroying = false;
  @tracked isDestroyed = false;

  @cached
  get hasDirtyAttributes(): boolean {
    const { path, resourceKey, store } = (this as unknown as PrivateReactiveResource)[Context];
    const record = store.peekRecord(resourceKey) as Model;

    if (record.hasDirtyAttributes && path) {
      const root = path.at(0) as string;
      return root in record.changedAttributes();
    }

    return false;
  }

  get isFragment() {
    return true;
  }

  get $type(): string | null | undefined {
    const { field } = (this as unknown as PrivateReactiveResource)[Context];
    return field?.type;
  }

  rollbackAttributes(this: PrivateReactiveResource): void {
    const { path, resourceKey, store } = this[Context];

    if (path) {
      const oldValue = store.cache.getRemoteAttr(resourceKey, path) as Value;
      store.cache.setAttr(resourceKey, path, oldValue);
    }
  }
}

export const FragmentExtension: {
  kind: 'object';
  name: 'fragment';
  features: typeof Fragment;
} = {
  kind: 'object' as const,
  name: 'fragment' as const,
  features: Fragment,
} satisfies CAUTION_MEGA_DANGER_ZONE_Extension;

export default FragmentExtension;
