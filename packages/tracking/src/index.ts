import { tagForProperty } from '@ember/-internals/metal';
import { dependentKeyCompat } from '@ember/object/compat';
import { consumeTag, createCache, dirtyTag, getValue } from '@glimmer/validator';

import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/build-config/deprecations';

export { untrack as untracked } from '@glimmer/validator';

type Tag = ReturnType<typeof tagForProperty>;
const emberDirtyTag = dirtyTag as unknown as (tag: Tag) => void;

export function buildSignalConfig(options: {
  wellknown: {
    Array: symbol | string;
  };
}) {
  const ARRAY_SIGNAL = options.wellknown.Array;

  return {
    createSignal(obj: object, key: string | symbol) {
      if (DEPRECATE_COMPUTED_CHAINS) {
        if (key === ARRAY_SIGNAL) {
          return [tagForProperty(obj, key), tagForProperty(obj, 'length'), tagForProperty(obj, '[]')] as const;
        }
      }
      return tagForProperty(obj, key);
    },
    consumeSignal(signal: Tag | [Tag, Tag, Tag]) {
      if (DEPRECATE_COMPUTED_CHAINS) {
        if (Array.isArray(signal)) {
          consumeTag(signal[0]);
          consumeTag(signal[1]);
          consumeTag(signal[2]);
        }
      } else {
        consumeTag(signal as Tag);
      }
    },
    notifySignal(signal: Tag | [Tag, Tag, Tag]) {
      if (DEPRECATE_COMPUTED_CHAINS) {
        if (Array.isArray(signal)) {
          emberDirtyTag(signal[0]);
          emberDirtyTag(signal[1]);
          emberDirtyTag(signal[2]);
        }
      } else {
        emberDirtyTag(signal as Tag);
      }
    },
    compat: dependentKeyCompat,
    createMemo: createCache,
    getMemoValue: getValue,
  };
}
