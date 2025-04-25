import { tagForProperty } from '@ember/-internals/metal';
// temporary so we can remove the glimmer and ember imports elsewhere
import { dirtyTag } from '@glimmer/validator';

import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';

type Tag = { ref: null; t: boolean };

function maybeDirty(tag: ReturnType<typeof tagForProperty> | null): void {
  if (tag) {
    // @ts-expect-error - we are using Ember's Tag not Glimmer's
    dirtyTag(tag);
  }
}

export function invalidateSignal(obj: Tag | WarpDriveSignal): void {
  if (DEBUG) {
    try {
      if ('tag' in obj) {
        if (DEPRECATE_COMPUTED_CHAINS) {
          maybeDirty(obj['[]']);
          maybeDirty(obj['@length']);
        }
        // @ts-expect-error - we are using Ember's Tag not Glimmer's
        dirtyTag(obj.tag);
      } else {
        obj.ref = null;
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message.includes('You attempted to update `undefined`')) {
          // @ts-expect-error
          const key = `<${obj._debug_base}>.${obj.key}`;
          e.message = e.message.replace('You attempted to update `undefined`', `You attempted to update ${key}`);
          e.stack = e.stack?.replace('You attempted to update `undefined`', `You attempted to update ${key}`);

          const lines = e.stack?.split(`\n`);
          const finalLines: string[] = [];
          let lastFile: string | null = null;

          lines?.forEach((line) => {
            if (line.trim().startsWith('at ')) {
              // get the last string in the line which contains the code source location
              const location = line.split(' ').at(-1)!;
              // remove the line and char offset info

              if (location.includes(':')) {
                const parts = location.split(':');
                parts.pop();
                parts.pop();
                const file = parts.join(':');
                if (file !== lastFile) {
                  lastFile = file;
                  finalLines.push('');
                }
              }
              finalLines.push(line);
            }
          });

          const splitstr = '`undefined` was first used:';
          const parts = e.message.split(splitstr);
          parts.splice(1, 0, `Original Stack\n=============\n${finalLines.join(`\n`)}\n\n\`${key}\` was first used:`);

          e.message = parts.join('');
        }
      }
      throw e;
    }
  } else {
    if ('tag' in obj) {
      if (DEPRECATE_COMPUTED_CHAINS) {
        maybeDirty(obj['[]']);
        maybeDirty(obj['@length']);
      }
      // @ts-expect-error - we are using Ember's Tag not Glimmer's
      dirtyTag(obj.tag);
    } else {
      obj.ref = null;
    }
  }
}

export const Signals = getOrSetGlobal('Signals', Symbol('Signals'));

export interface WarpDriveSignal {
  /**
   * Key on the associated object
   * @internal
   */
  key: string;
  _debug_base?: string;

  /**
   * Whether to "bust" the lastValue cache
   * @internal
   */
  shouldReset: boolean;

  /**
   * The reason this signal is dirty
   *
   * @internal
   */
  reason: string | null;

  /**
   * The framework specific "signal" e.g. glimmer "tracked"
   * or starbeam "cell" to consume/invalidate when appropriate.
   *
   * @internal
   */
  tag: ReturnType<typeof tagForProperty>;

  /**
   * In classic ember, arrays must entangle a `[]` symbol
   * in addition to any other tag in order for array chains to work.
   *
   * Note, this symbol MUST be the one that ember itself generates
   *
   * @internal
   */
  '[]': ReturnType<typeof tagForProperty> | null;
  /**
   * In classic ember, arrays must entangle a `@length` symbol
   * in addition to any other tag in order for array chains to work.
   *
   * Note, this symbol MUST be the one that ember itself generates
   *
   * @internal
   */
  '@length': ReturnType<typeof tagForProperty> | null;

  /**
   * The lastValue computed for this signal when
   * a signal is also used for storage.
   * @internal
   */
  lastValue: unknown;
}

/**
 * Create a signal for the key/object pairing.
 *
 * @internal
 * @param obj Object we're creating the signal on
 * @param key Key to create the signal for
 * @return the signal
 */
export function createSignal<T extends object>(obj: T, key: string): WarpDriveSignal {
  const _signal: WarpDriveSignal = {
    key,
    tag: tagForProperty(obj, key),
    reason: null,

    shouldReset: false,
    '[]': null,
    '@length': null,
    lastValue: undefined,
  };

  if (DEBUG) {
    function tryGet<T1 = string>(prop: string): T1 | undefined {
      try {
        return obj[prop as keyof typeof obj] as unknown as T1;
      } catch {
        return;
      }
    }
    const modelName =
      tryGet('$type') ?? tryGet('modelName') ?? tryGet<{ modelName?: string }>('constructor')?.modelName ?? '';

    const className = obj.constructor?.name ?? obj.toString?.() ?? 'unknown';
    _signal._debug_base = `${className}${modelName && !className.startsWith('SchemaRecord') ? `:${modelName}` : ''}`;
  }

  return _signal;
}

interface Signaler {
  [Signals]: Map<string, WarpDriveSignal>;
}

export function getSignal<T extends object>(obj: T, key: string, initialState: boolean): WarpDriveSignal {
  let signals = (obj as Signaler)[Signals];

  if (!signals) {
    signals = new Map();
    (obj as Signaler)[Signals] = signals;
  }

  let _signal = signals.get(key);
  if (!_signal) {
    _signal = createSignal(obj, key);
    _signal.isStale = initialState;
    signals.set(key, _signal);
  }
  return _signal;
}

export function peekSignal<T extends object>(obj: T, key: string): WarpDriveSignal | undefined {
  const signals = (obj as Signaler)[Signals];
  if (signals) {
    return signals.get(key);
  }
}

export function notifySignal<T extends object, K extends keyof T & string>(obj: T, key: K) {
  const signal = peekSignal(obj, key);
  if (signal) {
    signal.isStale = true;
    invalidateSignal(signal);
  }
}
