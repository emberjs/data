import type Store from '@ember-data/store';
import type { Signal } from '@ember-data/tracking/-private';
import { addToTransaction, createSignal, subscribe } from '@ember-data/tracking/-private';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import type { ObjectValue, Value } from '@warp-drive/core-types/json/raw';
import { STRUCTURED } from '@warp-drive/core-types/request';
import type { ObjectField, SchemaObjectField } from '@warp-drive/core-types/schema/fields';

import type { SchemaRecord } from '../record';
import type { SchemaService } from '../schema';
import { MUTATE, OBJECT_SIGNAL, SOURCE } from '../symbols';

export function notifyObject(obj: ManagedObject) {
  addToTransaction(obj[OBJECT_SIGNAL]);
}

type KeyType = string | symbol | number;
const ignoredGlobalFields = new Set<string>(['setInterval', 'nodeType', 'nodeName', 'length', 'document', STRUCTURED]);
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
  declare identifier: StableRecordIdentifier;
  declare path: string[];
  declare owner: SchemaRecord;
  declare [OBJECT_SIGNAL]: Signal;

  constructor(
    store: Store,
    schema: SchemaService,
    cache: Cache,
    field: ObjectField | SchemaObjectField,
    data: object,
    identifier: StableRecordIdentifier,
    path: string[],
    owner: SchemaRecord,
    isSchemaObject: boolean
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this[SOURCE] = { ...data };
    this[OBJECT_SIGNAL] = createSignal(this, 'length');
    const _SIGNAL = this[OBJECT_SIGNAL];
    // const boundFns = new Map<KeyType, ProxiedMethod>();
    this.identifier = identifier;
    this.path = path;
    this.owner = owner;
    const transaction = false;

    const proxy = new Proxy(this[SOURCE], {
      get<R extends typeof Proxy<object>>(target: object, prop: keyof R, receiver: R) {
        if (prop === OBJECT_SIGNAL) {
          return _SIGNAL;
        }
        if (prop === 'identifier') {
          return self.identifier;
        }
        if (prop === 'owner') {
          return self.owner;
        }
        if (prop === Symbol.toStringTag) {
          return `ManagedObject<${identifier.type}:${identifier.id} (${identifier.lid})>`;
        }
        if (prop === 'constructor') {
          return Object;
        }

        if (prop === 'toString') {
          return function () {
            return `ManagedObject<${identifier.type}:${identifier.id} (${identifier.lid})>`;
          };
        }

        if (prop === 'toHTML') {
          return function () {
            return '<div>ManagedObject</div>';
          };
        }
        if (_SIGNAL.shouldReset) {
          _SIGNAL.t = false;
          _SIGNAL.shouldReset = false;
          let newData = cache.getAttr(self.identifier, self.path);
          if (newData && newData !== self[SOURCE]) {
            if (!isSchemaObject && field.type) {
              const transform = schema.transformation(field);
              newData = transform.hydrate(newData as ObjectValue, field.options ?? null, self.owner) as ObjectValue;
            }
            self[SOURCE] = { ...(newData as ObjectValue) }; // Add type assertion for newData
          }
        }

        if (isSchemaObject) {
          const fields = schema.fields({ type: field.type! });
          // TODO: is there a better way to do this?
          if (typeof prop === 'string' && !ignoredGlobalFields.has(prop) && !fields.has(prop)) {
            throw new Error(`Field ${prop} does not exist on schema object ${field.type}`);
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
        if (prop === 'identifier') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          self.identifier = value;
          return true;
        }
        if (prop === 'owner') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          self.owner = value;
          return true;
        }
        if (isSchemaObject) {
          const fields = schema.fields({ type: field.type! });
          if (typeof prop === 'string' && !ignoredGlobalFields.has(prop) && !fields.has(prop)) {
            throw new Error(`Field ${prop} does not exist on schema object ${field.type}`);
          }
        }
        const reflect = Reflect.set(target, prop, value, receiver);

        if (reflect) {
          if (isSchemaObject || !field.type) {
            cache.setAttr(self.identifier, self.path, self[SOURCE] as Value);
            _SIGNAL.shouldReset = true;
            return true;
          }

          const transform = schema.transformation(field);
          const val = transform.serialize(self[SOURCE], field.options ?? null, self.owner);
          cache.setAttr(self.identifier, self.path, val);
          _SIGNAL.shouldReset = true;
        }
        return reflect;
      },
    }) as ManagedObject;

    return proxy;
  }
}
