/**
 In EmberData a `Model` is a class defining the attributes and relationships
  of a specific resource `type` (model name). In this sense it represents a static "schema".

  Data for individual resources fetched from your API is presented
  to the UI via instances of the `Model`s you define.

  An instantiated `Model` is referred to as a `record`.

  When we refer to the `ModelClass` we are referring to the class definition
  and the static schema methods present on it.

  When we refer to a `record` we refer to a specific class instance presenting
  the resource data for a given `type` and `id`.

  ### Defining a Model

  ```app/models/person.js
  import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

  export default Model.extend({
    name: attr(),

    dog: belongsTo('pet', { inverse: 'owners', async: false }),

    friends: hasMany('person', { inverse: 'friends', async: true }),
  });
  ```

  ### modelName convention

  By convention, the name of a given model (its `type`) matches the name
  of the file in the `app/models` folder and should be lowercase, singular
  and dasherized.

  @module @ember-data/model
  @main @ember-data/model
  @class Model
  @public
 */

export { Model as default, attr, belongsTo, hasMany } from './-private';
