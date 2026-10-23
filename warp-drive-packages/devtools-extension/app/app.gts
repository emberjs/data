import EmberRouter from '@ember/routing/router';

import Application from 'ember-strict-application-resolver';

class Router extends EmberRouter {
  // There is no address bar inside a DevTools panel, so keep routing in memory.
  location = 'none';
  rootURL = '/';
}

Router.map(function () {
  // Panel views are added here as they are built.
});

export default class App extends Application {
  modules = {
    './router': Router,
    ...import.meta.glob('./services/*.ts', { eager: true }),
    ...import.meta.glob('./templates/*.gts', { eager: true }),
  };
}
