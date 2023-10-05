import { createonly, readonly, optional } from '@warp-drive/schema-decorators';

class User {
  @optional
  @createonly
  declare id: string;
  @readonly
  declare $type: 'user';
}

export { User };
