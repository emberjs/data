import { assert } from '@warp-drive/build-config/macros';

import type { DerivedField } from '../../../types/schema/fields.ts';
import type { KindContext } from '../default-mode.ts';

export function getDerivedField(context: KindContext<DerivedField>): unknown {
  const { schema } = context.store;
  return schema.derivation(context.field)(context.record, context.field.options ?? null, context.field.name);
}

export function setDerivedField(context: KindContext<DerivedField>): boolean {
  assert(
    `ILLEGAL SET: Cannot set '${context.path.join('.')}' on '${context.resourceKey.type}' as ${context.field.kind} fields are not mutable`
  );
  return false;
}
