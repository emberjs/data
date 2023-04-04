<p align="center">
  <img
    class="project-logo"
    src="./ember-data-logo-dark.svg#gh-dark-mode-only"
    alt="EmberData Model"
    width="240px"
    title="EmberData Model"
    />
  <img
    class="project-logo"
    src="./ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData Model"
    width="240px"
    title="EmberData Model"
    />
</p>

<p align="center">Provides a Presentation Model for resource data in an EmberData Cache</p>

This package implements the EmberData Store's `instantiateRecord` and `teardownRecord` hooks
as well as configures an associated `SchemaService` implementation.

Models are defined as classes extending from `import Model from '@ember-data/model';` and the
attributes and relationships on these classes are parsed at runtime to supply static "schema"
to EmberData's SchemaService.

Resource data for individual resources fetched from your API is presented to the UI via instances
of the `Model`s you define. An instantiated `Model` is referred to as a `record`.

When we refer to the `ModelClass` as opposed to a `Model` or `Record` we are referring
specifically to the class definition and the static schema methods present on it.

When we refer to a `record` we refer to a specific class instance presenting
the resource data for a given `type` and `id`.

  ### Defining a Model

 *app/models/person.js*
  ```ts
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
