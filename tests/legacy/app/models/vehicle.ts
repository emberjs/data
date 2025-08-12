import type { Type } from '@warp-drive/core-types/symbols';

import type { WithFragment } from '#src/index.ts';
import { withFragmentDefaults } from '#src/utilities/with-fragment-defaults.ts';
import { withLegacy } from '#src/utilities/with-legacy.ts';
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
