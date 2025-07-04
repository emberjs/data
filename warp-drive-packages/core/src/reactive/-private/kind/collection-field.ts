import { assert } from '@warp-drive/build-config/macros';

import type { CollectionField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';

export function getCollectionField(context: KindContext<CollectionField>): unknown {
  assert(`Accessing collection fields is not yet implemented`);
}

export function setCollectionField(context: KindContext<CollectionField>): boolean {
  assert(`Setting collection fields is not yet implemented`);
  return false;
}
