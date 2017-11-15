import setupContainer from 'ember-data/setup-container';
import 'ember-data';

/*

  This code initializes Ember-Data onto an Ember application.

  If an Ember.js developer defines a subclass of DS.Store on their application,
  as `App.StoreService` (or via a module system that resolves to `service:store`)
  this code will automatically instantiate it and make it available on the
  router.

  Additionally, after an application's controllers have been injected, they will
  each have the store made available to them.

  For example, imagine an Ember.js application with the following classes:

  ```app/services/store.js
  import DS from 'ember-data';

  export default DS.Store.extend({
    adapter: 'custom'
  });
  ```

  ```app/controllers/posts.js
  import { Controller } from '@ember/controller';

  export default Controller.extend({
    // ...
  });

  When the application is initialized, `ApplicationStore` will automatically be
  instantiated, and the instance of `PostsController` will have its `store`
  property set to that instance.

  Note that this code will only be run if the `ember-application` package is
  loaded. If Ember Data is being used in an environment other than a
  typical application (e.g., node.js where only `ember-runtime` is available),
  this code will be ignored.
*/

export default {
  name: 'ember-data',
  initialize: setupContainer
};
