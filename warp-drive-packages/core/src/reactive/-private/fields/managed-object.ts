import { assert } from '@warp-drive/core/build-config/macros';

import {
  consumeInternalSignal,
  entangleSignal,
  notifyInternalSignal,
  OBJECT_SIGNAL,
  type WarpDriveSignal,
  withSignalStore,
} from '../../../store/-private.ts';
import { getOrSetGlobal } from '../../../types/-private.ts';
import type { ObjectValue, Value } from '../../../types/json/raw.ts';
import type { ObjectField, SchemaObjectField } from '../../../types/schema/fields.ts';
import type { KindContext } from '../default-mode.ts';
import type { ReactiveResource } from '../record.ts';
import type { SchemaService } from '../schema.ts';
import { Context, SOURCE } from '../symbols.ts';
import { isExtensionProp, performExtensionSet, performObjectExtensionGet } from './extension.ts';

export function notifyObject(obj: ManagedObject): void {
  notifyInternalSignal(obj[OBJECT_SIGNAL]);
}

type ObjectSymbol = typeof OBJECT_SIGNAL | typeof SOURCE | typeof Context;
const ObjectSymbols = new Set<ObjectSymbol>([OBJECT_SIGNAL, Context, SOURCE]);

type KeyType = string | symbol | number;
// const ignoredGlobalFields = new Set<string>(['setInterval', 'nodeType', 'nodeName', 'length', 'document', STRUCTURED]);
export interface ManagedObject {
  [SOURCE]: object;
  [Context]: KindContext<ObjectField>;
  [OBJECT_SIGNAL]: WarpDriveSignal;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ManagedObject {
  constructor(context: KindContext<ObjectField>) {
    const { field, path } = context;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this[SOURCE] = Object.assign({}, context.value);
    const signals = withSignalStore(this);
    const _SIGNAL = (this[OBJECT_SIGNAL] = entangleSignal(signals, this, OBJECT_SIGNAL, undefined));
    this[Context] = context;
    const identifier = context.resourceKey;
    const { cache, schema } = context.store;

    // prettier-ignore
    const extensions =
      !context.legacy ? null : (schema as SchemaService).CAUTION_MEGA_DANGER_ZONE_objectExtensions(field, null);

    const proxy = new Proxy(this[SOURCE], {
      ownKeys() {
        return Object.keys(self[SOURCE]);
      },

      has(target: unknown, prop: string | number | symbol) {
        return prop in self[SOURCE];
      },

      getOwnPropertyDescriptor(target, prop) {
        return {
          writable: context.editable,
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

        if (_SIGNAL.isStale) {
          _SIGNAL.isStale = false;
          let newData = cache.getAttr(identifier, path);
          if (newData && newData !== self[SOURCE]) {
            if (field.type) {
              const transform = schema.transformation(field);
              newData = transform.hydrate(
                newData as ObjectValue,
                (field.options as ObjectValue) ?? null,
                context.record
              ) as ObjectValue;
            }
            self[SOURCE] = Object.assign({}, newData) as ObjectValue; // Add type assertion for newData
          }
        }

        // toJSON and extensions need to come after we update data if stale
        if (prop === 'toJSON') {
          return function () {
            return structuredClone(self[SOURCE]);
          };
        }

        // we always defer to data before extensions
        if (prop in self[SOURCE]) {
          consumeInternalSignal(_SIGNAL);

          return (self[SOURCE] as R)[prop];
        }

        if (isExtensionProp(extensions, prop)) {
          return performObjectExtensionGet(receiver, extensions!, signals, prop);
        }

        return Reflect.get(target, prop, receiver) as R;
      },

      set(target: object, prop: KeyType, value: unknown, receiver: object) {
        assert(`Cannot set read-only property '${String(prop)}' on ManagedObject`, context.editable);

        // since objects function as dictionaries, we can't defer to schema/data before extensions
        // unless the prop is in the existing data.
        if (!(prop in self[SOURCE]) && isExtensionProp(extensions, prop)) {
          return performExtensionSet(receiver, extensions!, signals, prop, value);
        }

        const reflect = Reflect.set(target, prop, value, receiver);
        if (!reflect) {
          return false;
        }

        if (!field.type) {
          cache.setAttr(identifier, path, self[SOURCE] as Value);
        } else {
          const transform = schema.transformation(field);
          const val = transform.serialize(self[SOURCE], (field.options as ObjectValue) ?? null, context.record);
          cache.setAttr(identifier, path, val);
        }

        _SIGNAL.isStale = true;
        return true;
      },
    }) as ManagedObject;

    return proxy;
  }
}

export const ManagedObjectMap: Map<ReactiveResource, Map<string, ManagedObject | ReactiveResource>> = getOrSetGlobal(
  'ManagedObjectMap',
  new Map<ReactiveResource, Map<string, ManagedObject | ReactiveResource>>()
);

export function peekManagedObject(record: ReactiveResource, field: ObjectField): ManagedObject | undefined;
export function peekManagedObject(record: ReactiveResource, field: SchemaObjectField): ReactiveResource | undefined;
export function peekManagedObject(
  record: ReactiveResource,
  field: ObjectField | SchemaObjectField
): ManagedObject | ReactiveResource | undefined {
  const managedObjectMapForRecord = ManagedObjectMap.get(record);
  if (managedObjectMapForRecord) {
    return managedObjectMapForRecord.get(field.name);
  }
}
