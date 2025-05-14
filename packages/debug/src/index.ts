/**
  # Overview

  This package provides the `DataAdapter` which the [Ember Inspector](https://github.com/emberjs/ember-inspector)
  uses to subscribe and retrieve information for the `data` tab in the inspector.

  This package adds roughly .6 KB when minified and compressed to your application in production; however,
  you can opt out of shipping this addon in production via options in `ember-cli-build.js`

  ```js
  let app = new EmberApp(defaults, {
    emberData: {
      includeDataAdapterInProduction: false
    }
  });
  ```

  When using `ember-data` as a dependency of your app, the default is to ship the inspector support to production.

  When not using `ember-data` as a dependency but instead using EmberData via declaring specific `@ember-data/<package>`
  dependencies the default is to not ship to production.

  @module
*/
export { default } from './data-adapter';
