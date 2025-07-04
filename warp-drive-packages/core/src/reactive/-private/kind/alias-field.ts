import { assert } from '@warp-drive/build-config/macros';

import type { LegacyAliasField, ObjectAliasField, PolarisAliasField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';
import type { ReactiveResource } from '../record';

export function getAliasField(
  context: KindContext<LegacyAliasField | ObjectAliasField | PolarisAliasField>,
  record: ReactiveResource
): unknown {
  assert(`Alias field access is not implemented`);
}

export function setAliasField(
  context: KindContext<LegacyAliasField | ObjectAliasField | PolarisAliasField>,
  record: ReactiveResource,
  value: unknown
): boolean {
  assert(`Alias field setting is not implemented`);
  return false;
}
