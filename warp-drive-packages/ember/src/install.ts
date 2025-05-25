import { tagForProperty } from '@ember/-internals/metal';
import { _backburner } from '@ember/runloop';
import { consumeTag, createCache, dirtyTag, getValue, track, type UpdatableTag, updateTag } from '@glimmer/validator';

import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/core/build-config/deprecations';
import { setupSignals } from '@warp-drive/core/configure';
import type { SignalHooks } from '@warp-drive/core/store/-private';

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
          return;
        }
      }

      consumeTag(signal as Tag);
    },
    notifySignal(signal: Tag | [Tag, Tag, Tag]) {
      if (DEPRECATE_COMPUTED_CHAINS) {
        if (Array.isArray(signal)) {
          emberDirtyTag(signal[0]);
          emberDirtyTag(signal[1]);
          emberDirtyTag(signal[2]);
          return;
        }
      }
      emberDirtyTag(signal as Tag);
    },
    createMemo: <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
      if (DEPRECATE_COMPUTED_CHAINS) {
        const propertyTag = tagForProperty(object, key) as UpdatableTag;
        const memo = createCache(fn);
        let ret: F | undefined;
        const wrappedFn = () => {
          ret = getValue(memo) as F;
        };
        return () => {
          const tag = track(wrappedFn);
          updateTag(propertyTag, tag);
          consumeTag(tag);
          return ret!;
        };
      } else {
        const memo = createCache(fn);
        return () => getValue(memo) as F;
      }
    },
    willSyncFlushWatchers: () => {
      //@ts-expect-error
      return !!_backburner.currentInstance && _backburner._autorun !== true;
    },
  } satisfies SignalHooks<Tag | [Tag, Tag, Tag]>;
}

setupSignals(buildSignalConfig);
