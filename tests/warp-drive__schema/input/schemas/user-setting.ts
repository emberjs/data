import { collection, createonly, derived, field, optional, readonly, resource, Resource } from '@warp-drive/schema-decorators';

@Resource // Resource is a default "Trait" that provides the "id" and "$type" fields used by @warp-drive/schema-record
class UserSetting {
  // @optional - An optional field is one that may be omitted during create.
  // @readonly - A readonly field is one that may never be created or edited.
  // @createonly - A createonly field is one that may only be set during create.

  // We use declare to tell TypeScript that this field exists
  // We use the declared type to set the "cache" type for the field (what the API returns)
  // declare myField: string;

  // We use the field decorator to provide a "Transform" function for the field.
  // The transform's return type will be used as the "UI" type for the field.
  // e.g. "Date" instead of "string"
  // @field('luxon') declare someDateField: string;

  // We use the collection decorator to create a linkage to a collection of other resources
  // @collection('comment', { inverse: 'post' }) declare comments: Comment[];

  // We use the resource decorator to create a linkage to another resource
  // if the related resource will not always be present use `| null` with the type
  // @resource('user', { inverse: 'posts' }) declare author: User;

  // We use the derived decorator to create a field that is derived from other fields
  // Note your project can provide its own decorators that can simplify this.
  // @derived('concat', { fields: ['firstName', 'lastName'], separator: ' ' }) declare fullName: string;
}

export { UserSetting };
