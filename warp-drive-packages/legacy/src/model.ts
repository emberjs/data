/**
 * This package provides a Presentation Model for resource data in an WarpDrive Cache.
 *
 * Models are defined as classes extending from `import Model from '@ember-data/model';` and the
 * attributes and relationships on these classes are parsed at runtime to supply static "schema"
 * to WarpDrive's SchemaService.
 *
 * Resource data for individual resources fetched from your API is presented to the UI via instances
 * of the `Model`s you define. An instantiated `Model` is referred to as a `record`.

  When we refer to the `ModelClass` as opposed to a `Model` or `Record` we are referring
  specifically to the class definition and the static schema methods present on it.

  When we refer to a `record` we refer to a specific class instance presenting
  the resource data for a given `type` and `id`.

  ### Defining a Model

  ```js [app/models/person.js]
  import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

  export default class PersonModel extends Model {
    @attr name;

    @belongsTo('pet', { inverse: 'owners', async: false }) dog;

    @hasMany('person', { inverse: 'friends', async: true }) friends;
  }
  ```

  ### modelName convention

  By convention, the name of a given model (its `type`) matches the name
  of the file in the `app/models` folder and should be lowercase, singular
  and dasherized.

  @module
 */
export { attr } from './model/-private/attr';
export { belongsTo } from './model/-private/belongs-to';
export { hasMany } from './model/-private/has-many';
export { Model, restoreDeprecatedModelRequestBehaviors } from './model/-private/model';
export { Model as default } from './model/-private/model';

export type { PromiseBelongsTo as AsyncBelongsTo } from './model/-private/promise-belongs-to';
export type { PromiseManyArray as AsyncHasMany } from './model/-private/promise-many-array';
export type { RelatedCollection as ManyArray } from '@warp-drive/core/store/-private';
export type { RelatedCollection as HasMany } from '@warp-drive/core/store/-private';
export { instantiateRecord, teardownRecord, modelFor } from './model/-private/hooks';
export { buildSchema } from './model/-private/schema-provider';
