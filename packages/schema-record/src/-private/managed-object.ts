import type Store from '@ember-data/store';
import type { Signal } from '@ember-data/tracking/-private';
import { addToTransaction, createSignal, subscribe } from '@ember-data/tracking/-private';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import type { ObjectValue, Value } from '@warp-drive/core-types/json/raw';
import type { ObjectField } from '@warp-drive/core-types/schema/fields';

import type { SchemaRecord } from '../record';
import type { SchemaService } from '../schema';
import { MUTATE, OBJECT_SIGNAL, SOURCE } from '../symbols';

export function notifyObject(obj: ManagedObject) {
  addToTransaction(obj[OBJECT_SIGNAL]);
}

type KeyType = string | symbol | number;

export interface ManagedObject {
  [MUTATE]?(
    target: unknown[],
    receiver: typeof Proxy<unknown[]>,
    prop: string,
    args: unknown[],
    _SIGNAL: Signal
  ): unknown;
}

export class ManagedObject {
  [SOURCE]: object;
  declare address: StableRecordIdentifier;
  declare key: string;
  declare owner: SchemaRecord;
  declare [OBJECT_SIGNAL]: Signal;

  constructor(
    store: Store,
    schema: SchemaService,
    cache: Cache,
    field: ObjectField,
    data: object,
    address: StableRecordIdentifier,
    key: string,
    owner: SchemaRecord
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this[SOURCE] = { ...data };
    this[OBJECT_SIGNAL] = createSignal(this, 'length');
    const _SIGNAL = this[OBJECT_SIGNAL];
    // const boundFns = new Map<KeyType, ProxiedMethod>();
    this.address = address;
    this.key = key;
    this.owner = owner;
    const transaction = false;

    const proxy = new Proxy(this[SOURCE], {
      get<R extends typeof Proxy<object>>(target: object, prop: keyof R, receiver: R) {
        if (prop === OBJECT_SIGNAL) {
          return _SIGNAL;
        }
        if (prop === 'address') {
          return self.address;
        }
        if (prop === 'key') {
          return self.key;
        }
        if (prop === 'owner') {
          return self.owner;
        }

        if (_SIGNAL.shouldReset) {
          _SIGNAL.t = false;
          _SIGNAL.shouldReset = false;
          let newData = cache.getAttr(self.address, self.key);
          if (newData && newData !== self[SOURCE]) {
            if (field.type) {
              const transform = schema.transformation(field);
              newData = transform.hydrate(newData as ObjectValue, field.options ?? null, self.owner) as ObjectValue;
            }
            self[SOURCE] = { ...(newData as ObjectValue) }; // Add type assertion for newData
          }
        }

        if (prop in self[SOURCE]) {
          if (!transaction) {
            subscribe(_SIGNAL);
          }

          return (self[SOURCE] as R)[prop];
        }
        return Reflect.get(target, prop, receiver) as R;
      },

      set(target, prop: KeyType, value, receiver) {
        if (prop === 'address') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          self.address = value;
          return true;
        }
        if (prop === 'key') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          self.key = value;
          return true;
        }
        if (prop === 'owner') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          self.owner = value;
          return true;
        }
        const reflect = Reflect.set(target, prop, value, receiver);

        if (reflect) {
          if (!field.type) {
            cache.setAttr(self.address, self.key, self[SOURCE] as Value);
            _SIGNAL.shouldReset = true;
            return true;
          }

          const transform = schema.transformation(field);
          const val = transform.serialize(self[SOURCE], field.options ?? null, self.owner);
          cache.setAttr(self.address, self.key, val);
          _SIGNAL.shouldReset = true;
        }
        return reflect;
      },
    }) as ManagedObject;

    return proxy;
  }
}
