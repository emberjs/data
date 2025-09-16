import type { Type } from '@warp-drive/core-types/symbols';
import type { WithFragment } from '@warp-drive/legacy/model-fragments';
import { withFragmentDefaults, withLegacy } from '@warp-drive/legacy/model-fragments';

import type { Passenger } from './passenger';

export const VehicleSchema = withLegacy({
  type: 'vehicle',
  fields: [withFragmentDefaults('passenger')],
});

export interface Vehicle {
  id: string;
  passenger: WithFragment<Passenger> | null;
  [Type]: 'vehicle';
}
