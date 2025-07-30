import { assert } from '@warp-drive/build-config/macros';

import { ARRAY_SIGNAL, entangleSignal, peekInternalSignal } from '../../../store/-private';
import type { ArrayValue, ObjectValue } from '../../../types/json/raw';
import type { ArrayField, SchemaArrayField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';
import { ManagedArray } from '../fields/managed-array';

export function getArrayField(context: KindContext<ArrayField | SchemaArrayField>): unknown {
  const signal = entangleSignal(context.signals, context.record, context.path.at(-1)!, null);
  // the thing we hand out needs to know its owner and path in a private manner
  // its "address" is the parent identifier (identifier) + field name (field.name)
  //  in the nested object case field name here is the full dot path from root resource to this value
  // its "key" is the field on the parent record
  // its "owner" is the parent record
  const { record } = context;
  let managedArray = signal.value as ManagedArray | null;

  if (managedArray) {
    return managedArray;
  } else {
    const { store, resourceKey, path, field } = context;
    const { cache } = store;
    let rawValue = (
      context.editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path)
    ) as unknown[];

    // we only apply the defaultValue if the rawValue is undefined, this allows
    // use of explicit null for the field.
    if (!rawValue && typeof rawValue === 'undefined' && field.kind === 'schema-array' && field.options?.defaultValue) {
      rawValue = [];
    }

    if (!rawValue) {
      return null;
    }
    managedArray = new ManagedArray(context, record, rawValue);
    signal.value = managedArray;
  }
  return managedArray;
}

export function setArrayField(context: KindContext<ArrayField>): boolean {
  const { field, record, value } = context;
  const { cache, schema } = context.store;
  const fieldSignal = peekInternalSignal(context.signals, context.path.at(-1)!);
  const peeked = fieldSignal?.value as ManagedArray | undefined;

  const transform = field.type ? schema.transformation(field) : null;
  // prettier-ignore
  const rawValue = value === null ? null
    : field.type ? (value as ArrayValue).map((item) => transform!.serialize(item, (field.options as ObjectValue) ?? null, record))
    : (value as ArrayValue)?.slice();

  cache.setAttr(context.resourceKey, context.path, rawValue);
  if (peeked) {
    assert(`Expected the peekManagedArray for ${field.kind} to return a ManagedArray`, ARRAY_SIGNAL in peeked);
    const arrSignal = peeked[ARRAY_SIGNAL];
    arrSignal.isStale = true;
    // TODO run array destroy?
  }

  if (!Array.isArray(rawValue) && fieldSignal) {
    fieldSignal.value = null;
  }

  return true;
}
