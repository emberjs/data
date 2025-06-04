import { assert } from '@warp-drive/core/build-config/macros';

import {
  consumeInternalSignal,
  entangleSignal,
  notifyInternalSignal,
  OBJECT_SIGNAL,
  type WarpDriveSignal,
  withSignalStore,
} from '../../../store/-private.ts';
import type { Cache } from '../../../types/cache.ts';
import type { StableRecordIdentifier } from '../../../types/identifier.ts';
import type { ObjectValue, Value } from '../../../types/json/raw.ts';
import type { ObjectField, SchemaObjectField } from '../../../types/schema/fields.ts';
import type { ReactiveResource } from '../record.ts';
import type { SchemaService } from '../schema.ts';
import { Editable, EmbeddedPath, Legacy, MUTATE, Parent, SOURCE } from '../symbols.ts';

export function notifyObject(obj: ManagedObject) {
  notifyInternalSignal(obj[OBJECT_SIGNAL]);
}

type ObjectSymbol = typeof OBJECT_SIGNAL | typeof Parent | typeof SOURCE | typeof Editable | typeof EmbeddedPath;
const ObjectSymbols = new Set<ObjectSymbol>([OBJECT_SIGNAL, Parent, SOURCE, Editable, EmbeddedPath]);

type KeyType = string | symbol | number;
// const ignoredGlobalFields = new Set<string>(['setInterval', 'nodeType', 'nodeName', 'length', 'document', STRUCTURED]);

export interface ManagedObject {
  [MUTATE]?(
    target: unknown[],
    receiver: typeof Proxy<unknown[]>,
    prop: string,
    args: unknown[],
    _SIGNAL: WarpDriveSignal
  ): unknown;
}

export class ManagedObject {
  declare [SOURCE]: object;
  declare [Parent]: StableRecordIdentifier;
  declare [EmbeddedPath]: string[];
  declare [OBJECT_SIGNAL]: WarpDriveSignal;
  declare [Editable]: boolean;
  declare [Legacy]: boolean;

  constructor(
    schema: SchemaService,
    cache: Cache,
    field: ObjectField | SchemaObjectField,
    data: object,
    identifier: StableRecordIdentifier,
    path: string[],
    owner: ReactiveResource,
    editable: boolean,
    legacy: boolean
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this[SOURCE] = { ...data };
    const signals = withSignalStore(this);
    const _SIGNAL = (this[OBJECT_SIGNAL] = entangleSignal(signals, this, OBJECT_SIGNAL, undefined));
    this[Editable] = editable;
    this[Legacy] = legacy;
    this[Parent] = identifier;
    this[EmbeddedPath] = path;

    const proxy = new Proxy(this[SOURCE], {
      ownKeys() {
        return Object.keys(self[SOURCE]);
      },

      has(target: unknown, prop: string | number | symbol) {
        return prop in self[SOURCE];
      },

      getOwnPropertyDescriptor(target, prop) {
        return {
          writable: editable,
          enumerable: true,
          configurable: true,
        };
      },

      get<R extends typeof Proxy<object>>(target: object, prop: keyof R, receiver: R) {
        if (ObjectSymbols.has(prop as ObjectSymbol)) {
          return self[prop as keyof typeof target];
        }

        if (prop === Symbol.toPrimitive) {
          return () => null;
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
            return '<span>ManagedObject</span>';
          };
        }
        if (prop === 'toJSON') {
          return function () {
            return structuredClone(self[SOURCE]);
          };
        }

        if (_SIGNAL.isStale) {
          _SIGNAL.isStale = false;
          let newData = cache.getAttr(identifier, path);
          if (newData && newData !== self[SOURCE]) {
            if (field.type) {
              const transform = schema.transformation(field);
              newData = transform.hydrate(newData as ObjectValue, field.options ?? null, owner) as ObjectValue;
            }
            self[SOURCE] = { ...(newData as ObjectValue) }; // Add type assertion for newData
          }
        }

        if (prop in self[SOURCE]) {
          consumeInternalSignal(_SIGNAL);

          return (self[SOURCE] as R)[prop];
        }
        return Reflect.get(target, prop, receiver) as R;
      },

      set(target, prop: KeyType, value, receiver) {
        assert(`Cannot set read-only property '${String(prop)}' on ManagedObject`, editable);
        const reflect = Reflect.set(target, prop, value, receiver);
        if (!reflect) {
          return false;
        }

        if (!field.type) {
          cache.setAttr(identifier, path, self[SOURCE] as Value);
        } else {
          const transform = schema.transformation(field);
          const val = transform.serialize(self[SOURCE], field.options ?? null, owner);
          cache.setAttr(identifier, path, val);
        }

        _SIGNAL.isStale = true;
        return true;
      },
    }) as ManagedObject;

    return proxy;
  }
}
