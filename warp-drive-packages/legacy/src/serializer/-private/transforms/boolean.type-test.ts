import { attr } from '../../../model.ts';
import type { BooleanTransform } from './boolean.ts';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class TestModel {
  @attr<BooleanTransform>('boolean') declare isAdmin: boolean;
  @attr<BooleanTransform>('boolean', {}) declare isOwner: boolean;
  @attr<BooleanTransform>('boolean', { allowNull: false }) declare isUser: boolean;
  @attr<BooleanTransform>('boolean', { allowNull: true }) declare isPrepared: boolean | null;
}
