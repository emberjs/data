import { assert } from '@warp-drive/build-config/macros';

import { entangleSignal } from '../../../store/-private';
import type { CollectionField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';

export function getCollectionField(context: KindContext<CollectionField>): unknown {
  entangleSignal(context.signals, context.record, context.path.at(-1)!, null);
  assert(`Accessing collection fields is not yet implemented`);
}

export function setCollectionField(context: KindContext<CollectionField>): boolean {
  assert(`Setting collection fields is not yet implemented`);
  return false;
}
