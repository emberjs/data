import { attr } from '@ember-data/model';

import type { BooleanTransform } from './boolean';

export class TestModel {
  @attr<BooleanTransform>('boolean') declare isAdmin: boolean;
  @attr<BooleanTransform>('boolean', {}) declare isOwner: boolean;
  @attr<BooleanTransform>('boolean', { allowNull: false }) declare isUser: boolean;
  @attr<BooleanTransform>('boolean', { allowNull: true }) declare isPrepared: boolean | null;
}
