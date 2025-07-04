import { assert } from '@warp-drive/build-config/macros';

import type { LegacyAliasField, ObjectAliasField, PolarisAliasField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';

export function getAliasField(context: KindContext<LegacyAliasField | ObjectAliasField | PolarisAliasField>): unknown {
  assert(`Alias field access is not implemented`);
}

export function setAliasField(context: KindContext<LegacyAliasField | ObjectAliasField | PolarisAliasField>): boolean {
  assert(`Alias field setting is not implemented`);
  return false;
}
