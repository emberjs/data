import type { TransformName } from '@warp-drive/core/types/symbols';

export interface StringTransform {
  [TransformName]: 'string';
}
/**
  The `StringTransform` class is used to serialize and deserialize
  string attributes on Ember Data record objects. This transform is
  used when `string` is passed as the type parameter to the
  [attr](/ember-data/release/functions/@ember-data%2Fmodel/attr) function.

  Usage

  ```js [app/models/user.js]
  import Model, { attr, belongsTo } from '@ember-data/model';

  export default class UserModel extends Model {
    @attr('boolean') isAdmin;
    @attr('string') name;
    @attr('string') email;
  }
  ```

  @public
 */
export class StringTransform {
  deserialize(serialized: unknown, _options?: Record<string, unknown>): string | null {
    return !serialized && serialized !== '' ? null : String(serialized);
  }
  serialize(deserialized: unknown, _options?: Record<string, unknown>): string | null {
    return !deserialized && deserialized !== '' ? null : String(deserialized);
  }

  static create(): StringTransform {
    return new this();
  }
}
