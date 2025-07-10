import { assert } from '@warp-drive/build-config/macros';

import { entangleSignal } from '../../../store/-private';
import type { ObjectValue, Value } from '../../../types/json/raw';
import type { ObjectSchema, SchemaObjectField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';
import { ManagedObjectMap } from '../fields/managed-object';
import { ReactiveResource } from '../record';
import { Destroy } from '../symbols';

type MemoizedSchemaObject = {
  type: string;
  identity: string | object;
  value: ReactiveResource;
};

export function getSchemaObjectField(context: KindContext<SchemaObjectField>): unknown {
  const signal = entangleSignal(context.signals, context.record, context.path.at(-1)!, null);
  const { store, resourceKey, path } = context;
  const { cache } = store;
  const rawValue = (
    context.editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path)
  ) as object;

  if (!rawValue) {
    if (signal.value) {
      const value = signal.value as MemoizedSchemaObject;
      // TODO if we had idle scheduling this should be done there.
      void Promise.resolve().then(() => {
        value.value[Destroy]();
      });
      signal.value = null;
    }
    return null;
  }

  const { field } = context;
  const { schema } = store;
  let objectType: string;

  if (field.options?.polymorphic) {
    const typePath = field.options.type ?? 'type';
    // if we are polymorphic, then context.field.options.type will
    // either specify a path on the rawValue to use as the type, defaulting to "type" or
    // the special string "@hash" which tells us to treat field.type as a hashFn name with which
    // to calc the type.
    if (typePath === '@hash') {
      assert(`Expected the field to define a hashFn as its type`, field.type);
      const hashFn = schema.hashFn({ type: field.type });
      // TODO consider if there are better options and name args we could provide.
      objectType = hashFn(rawValue, null, null);
    } else {
      objectType = (rawValue as ObjectValue)[typePath] as string;
      assert(
        `Expected the type path for the field to be a value on the raw object`,
        typePath && objectType && typeof objectType === 'string'
      );
    }
  } else {
    assert(`A non-polymorphic SchemaObjectField must provide a SchemaObject type in its definition`, field.type);
    objectType = field.type;
  }

  const hashField = (schema.resource({ type: objectType }) as ObjectSchema).identity;
  const identity = hashField
    ? schema.hashFn(hashField)(rawValue, hashField.options ?? null, hashField.name)
    : field.name;

  const cachedSchemaObject = signal.value as MemoizedSchemaObject | null;
  if (cachedSchemaObject) {
    if (cachedSchemaObject.type === objectType && cachedSchemaObject.identity === identity) {
      return cachedSchemaObject.value;
    } else {
      // TODO if we had idle scheduling this should be done there.
      void Promise.resolve().then(() => {
        cachedSchemaObject.value[Destroy]();
      });
    }
  }

  const schemaObject = new ReactiveResource({
    store: context.store,
    resourceKey: context.resourceKey,
    modeName: context.modeName,
    legacy: context.legacy,
    editable: context.editable,
    path: context.path,
    field: context.field,
    value: objectType,
  });

  signal.value = {
    type: objectType,
    identity: identity,
    value: schemaObject,
  };
  return schemaObject;
}

export function setSchemaObjectField(context: KindContext<SchemaObjectField>): boolean {
  const { store, value } = context;
  let newValue = value as Value;
  if (value !== null) {
    assert(`Expected value to be an object`, typeof value === 'object');
    newValue = { ...(value as ObjectValue) };
    // FIXME the case of field.type to string here is likely incorrect
    const schemaFields = store.schema.fields({ type: context.field.type as string });
    for (const key of Object.keys(newValue)) {
      if (!schemaFields.has(key)) {
        throw new Error(`Field ${key} does not exist on schema object ${context.field.type}`);
      }
    }
  } else {
    ManagedObjectMap.delete(context.record);
  }
  store.cache.setAttr(context.resourceKey, context.path, newValue);
  // const peeked = peekManagedObject(self, field);
  // if (peeked) {
  //   const objSignal = peeked[OBJECT_SIGNAL];
  //   objSignal.isStale = true;
  // }
  return true;
}
